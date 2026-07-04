import { assertCronAuthorized } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendReminderEmail } from "@/lib/email";
import {
  REMINDER_INTERVALS_MINUTES,
  REMINDER_LOOKAHEAD_MS,
  selectRacesInReminderWindow,
  shouldSendReminderNow,
  type ReminderRaceWeekend
} from "@/lib/reminder-races";
import { usersWithCompletePicks, userHasCompletePicks } from "@/lib/reminder-submission";
import { filterActiveRaceWeekends } from "@/lib/cancelled-races";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EventType = "quali" | "sprint" | "race";

function intervalLabel(minutes: number): string {
  if (minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}min`;
}

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  // Fetch upcoming races, then keep any with a session in the reminder window.
  // Must check sprint_start too — on sprint weekends sprint is *before* quali, so
  // anchoring only on quali_start misses every early sprint reminder interval.
  const nowMs = Date.now();
  const { data: upcoming } = await supabase
    .from("race_weekends")
    .select("id,grand_prix,quali_start,sprint_start,race_start,has_sprint")
    .not("id", "like", "jolpi-%")
    .gte("race_start", new Date(nowMs).toISOString());

  const races = selectRacesInReminderWindow(
    filterActiveRaceWeekends(upcoming ?? []),
    nowMs,
    REMINDER_LOOKAHEAD_MS
  );

  if (!races.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0 });

  const { data: allUsers } = await supabase.from("users").select("id,email,display_name");
  if (!allUsers?.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0 });

  let sent = 0;
  let skipped = 0;

  for (const race of races as ReminderRaceWeekend[]) {
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
        if (!shouldSendReminderNow(start, intervalMins, nowMs)) continue;

        const label = intervalLabel(intervalMins);

        // Find users who have NOT submitted a complete pick set for this session
        const { data: submitted } = await supabase
          .from("predictions")
          .select("user_id")
          .eq("race_id", race.id)
          .eq("event_type", eventType);

        const submittedIds = usersWithCompletePicks(submitted ?? [], eventType);

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
            // Re-check immediately before send (picks may have landed since the batch query).
            if (await userHasCompletePicks(supabase, user.id, race.id, eventType)) {
              skipped++;
              continue;
            }

            // Claim the notification_log slot FIRST (before sending) to prevent race
            // conditions where two concurrent cron runs both send the same reminder.
            // The unique constraint on (user_id, race_id, event_type, interval_label)
            // means only one run wins — the other gets a conflict error and skips.
            const { error: claimError } = await supabase.from("notification_log").insert({
              user_id: user.id,
              race_id: race.id,
              event_type: eventType,
              interval_label: label
            });
            if (claimError) {
              // Another concurrent run already claimed this slot — skip
              skipped++;
              continue;
            }

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
