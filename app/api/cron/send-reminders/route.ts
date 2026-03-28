import { assertCronAuthorized } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendReminderEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Minutes before each session start at which we send a reminder
const REMINDER_INTERVALS_MINUTES = [48 * 60, 24 * 60, 12 * 60, 6 * 60, 3 * 60, 60, 5];

// How long after a threshold we'll still send the reminder.
// Set to 6h so GitHub Actions delays (which can be 30-120+ min) don't silently drop emails.
// notification_log dedup ensures each interval is only sent once even if cron fires many times.
const MATCH_WINDOW_MINUTES = 6 * 60;

type EventType = "quali" | "sprint" | "race";

interface RaceWeekend {
  id: string;
  grand_prix: string;
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
  has_sprint: boolean;
}

function intervalLabel(minutes: number): string {
  if (minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}min`;
}

function shouldSendNow(sessionStart: string, intervalMinutes: number): boolean {
  const sessionTime = new Date(sessionStart).getTime();
  const targetTime = sessionTime - intervalMinutes * 60 * 1000;
  const now = Date.now();
  const diffMinutes = (now - targetTime) / 60000;
  // Fire if we're within the match window past the target time
  return diffMinutes >= 0 && diffMinutes < MATCH_WINDOW_MINUTES;
}

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  // Fetch races with sessions in the next 49 hours
  const lookaheadMs = (48 * 60 + 60) * 60 * 1000;
  const cutoff = new Date(Date.now() + lookaheadMs).toISOString();
  const { data: races } = await supabase
    .from("race_weekends")
    .select("id,grand_prix,quali_start,sprint_start,race_start,has_sprint")
    .lte("quali_start", cutoff)
    .gte("race_start", new Date().toISOString());

  if (!races?.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0 });

  const { data: allUsers } = await supabase.from("users").select("id,email,display_name");
  if (!allUsers?.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0 });

  let sent = 0;
  let skipped = 0;

  for (const race of races as RaceWeekend[]) {
    const sessions: { eventType: EventType; start: string }[] = [
      { eventType: "quali", start: race.quali_start },
      ...(race.has_sprint && race.sprint_start
        ? [{ eventType: "sprint" as EventType, start: race.sprint_start }]
        : []),
      { eventType: "race", start: race.race_start }
    ];

    for (const { eventType, start } of sessions) {
      // Skip sessions that have already started
      if (new Date(start) <= new Date()) continue;

      for (const intervalMins of REMINDER_INTERVALS_MINUTES) {
        if (!shouldSendNow(start, intervalMins)) continue;

        const label = intervalLabel(intervalMins);

        // Find users who have NOT submitted picks for this session
        const { data: submitted } = await supabase
          .from("predictions")
          .select("user_id")
          .eq("race_id", race.id)
          .eq("event_type", eventType);

        const submittedIds = new Set((submitted || []).map((r) => r.user_id));

        // Find users who already got this reminder
        const { data: alreadySent } = await supabase
          .from("notification_log")
          .select("user_id")
          .eq("race_id", race.id)
          .eq("event_type", eventType)
          .eq("interval_label", label);

        const alreadySentIds = new Set((alreadySent || []).map((r) => r.user_id));

        const targets = allUsers.filter(
          (u) => !submittedIds.has(u.id) && !alreadySentIds.has(u.id)
        );

        for (const user of targets) {
          try {
            // For reminders with < 1 h to go, generate a one-time magic link so the user
            // is signed in automatically on click. For longer-horizon reminders the link
            // would already have expired (Supabase default OTP expiry = 1 h), so we fall
            // back to the plain /picks URL instead — users who are already logged in land
            // straight on the picks page, others are prompted to sign in.
            let picksLink = `${appUrl}/picks`;
            if (intervalMins <= 60) {
              const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: "magiclink",
                email: user.email,
                options: {
                  redirectTo: `${appUrl}/auth/callback?next=/picks`
                }
              });
              if (linkError || !linkData?.properties?.action_link) {
                console.warn(`Magic link generation failed for ${user.email}, using plain URL:`, linkError);
                // fall through — picksLink stays as the plain app URL
              } else {
                picksLink = linkData.properties.action_link;
              }
            }

            await sendReminderEmail({
              to: user.email,
              name: user.display_name || user.email.split("@")[0],
              raceName: race.grand_prix,
              eventType,
              minutesLeft: intervalMins,
              picksLink,
              isMagicLink: intervalMins <= 60
            });

            await supabase.from("notification_log").insert({
              user_id: user.id,
              race_id: race.id,
              event_type: eventType,
              interval_label: label
            });

            sent++;
          } catch (err) {
            console.error(`Reminder send failed for ${user.email}:`, err);
            skipped++;
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
