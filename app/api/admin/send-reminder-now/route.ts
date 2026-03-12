import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendReminderEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  raceId: z.string(),
  eventType: z.enum(["quali", "sprint", "race"]),
});

/**
 * POST /api/admin/send-reminder-now
 * Immediately sends reminder emails to all players who haven't submitted picks
 * for the given race+event. Bypasses the time-window check.
 */
export async function POST(req: Request) {
  await assertAdmin();
  const body = schema.parse(await req.json());
  const { raceId, eventType } = body;

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  // Fetch race info
  const { data: race } = await supabase
    .from("race_weekends")
    .select("id,grand_prix,quali_start,sprint_start,race_start")
    .eq("id", raceId)
    .single();

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  // All players
  const { data: allUsers } = await supabase.from("users").select("id,email,display_name");
  if (!allUsers?.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0 });

  // Who already submitted
  const { data: submitted } = await supabase
    .from("predictions")
    .select("user_id")
    .eq("race_id", raceId)
    .eq("event_type", eventType);

  const submittedIds = new Set((submitted || []).map(r => r.user_id));
  const targets = allUsers.filter(u => !submittedIds.has(u.id));

  let sent = 0, skipped = 0;

  for (const user of targets) {
    try {
      // Try to generate a magic link; fall back to plain app URL if it fails.
      // Magic links expire after ~1 h so they're only reliable for imminent sessions.
      let picksLink = `${appUrl}/picks`;
      let isMagicLink = false;
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: { redirectTo: `${appUrl}/auth/callback?next=/picks` }
      });
      if (linkError || !linkData?.properties?.action_link) {
        console.warn(`Link gen failed for ${user.email}, using plain URL:`, linkError);
      } else {
        picksLink = linkData.properties.action_link;
        isMagicLink = true;
      }

      await sendReminderEmail({
        to: user.email,
        name: user.display_name || user.email.split("@")[0],
        raceName: race.grand_prix,
        eventType,
        minutesLeft: Math.round((new Date(
          eventType === "quali" ? race.quali_start
          : eventType === "sprint" ? (race.sprint_start ?? race.race_start)
          : race.race_start
        ).getTime() - Date.now()) / 60000),
        picksLink,
        isMagicLink
      });

      sent++;
    } catch (err) {
      console.error(`Send failed for ${user.email}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, alreadySubmitted: submittedIds.size });
}
