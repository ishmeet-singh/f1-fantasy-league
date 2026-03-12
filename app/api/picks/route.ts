import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  raceId: z.string().min(1),
  eventType: z.enum(["quali", "sprint", "race"]),
  picks: z.record(z.string())
});

const sizeByEvent = { quali: 3, sprint: 10, race: 10 } as const;

const WINDOW_HOURS = 48;

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());
  const admin = getSupabaseAdmin();

  const { data: race } = await admin
    .from("race_weekends")
    .select("quali_start,sprint_start,race_start,has_sprint")
    .eq("id", body.raceId)
    .single();

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  if (body.eventType === "sprint" && !race.has_sprint) {
    return NextResponse.json({ error: "No sprint for this race" }, { status: 400 });
  }

  // Window opens 48h before the EARLIEST session of the weekend (sprint or qualifying)
  const firstSessionTime = Math.min(
    new Date(race.quali_start).getTime(),
    race.has_sprint && race.sprint_start ? new Date(race.sprint_start).getTime() : Infinity
  );
  const windowOpenAt = new Date(firstSessionTime - WINDOW_HOURS * 60 * 60 * 1000);
  if (new Date() < windowOpenAt) {
    return NextResponse.json({ error: "Picks window has not opened yet" }, { status: 400 });
  }

  const deadline =
    body.eventType === "quali"
      ? race.quali_start
      : body.eventType === "sprint"
        ? race.sprint_start
        : race.race_start;

  if (!deadline || new Date(deadline) <= new Date()) {
    return NextResponse.json({ error: "Locked — session has started" }, { status: 400 });
  }

  // Also lock if results already exist for this event (e.g. after simulation)
  const { data: existingResults } = await admin
    .from("results")
    .select("id")
    .eq("race_id", body.raceId)
    .eq("event_type", body.eventType)
    .limit(1)
    .maybeSingle();

  if (existingResults) {
    return NextResponse.json({ error: "Locked — results already published for this session" }, { status: 400 });
  }

  const maxSize = sizeByEvent[body.eventType];
  const entries = Object.entries(body.picks)
    .map(([pos, driverId]) => ({
      user_id: user.id,
      race_id: body.raceId,
      event_type: body.eventType,
      driver_id: driverId,
      predicted_position: Number(pos)
    }))
    .filter((r) => r.driver_id)
    .filter((r) => Number.isInteger(r.predicted_position) && r.predicted_position >= 1 && r.predicted_position <= maxSize);

  if (entries.length !== maxSize) {
    return NextResponse.json({ error: `Exactly ${maxSize} picks required` }, { status: 400 });
  }

  const uniqueDrivers = new Set(entries.map((e) => e.driver_id));
  if (uniqueDrivers.size !== entries.length) {
    return NextResponse.json({ error: "Duplicate drivers not allowed" }, { status: 400 });
  }

  // Preserve the original first-submission timestamp
  const { data: existing } = await admin
    .from("predictions")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("race_id", body.raceId)
    .eq("event_type", body.eventType)
    .limit(1)
    .maybeSingle();

  const firstSubmittedAt = existing?.created_at ?? new Date().toISOString();
  const nowIso = new Date().toISOString();

  await admin
    .from("predictions")
    .delete()
    .eq("user_id", user.id)
    .eq("race_id", body.raceId)
    .eq("event_type", body.eventType);

  // Try with updated_at (requires migration); fall back without it if column doesn't exist yet
  const withTimestamps = entries.map((e) => ({ ...e, created_at: firstSubmittedAt, updated_at: nowIso }));
  let { error } = await admin.from("predictions").insert(withTimestamps);
  if (error?.message?.includes("updated_at")) {
    const fallback = await admin.from("predictions").insert(
      entries.map((e) => ({ ...e, created_at: firstSubmittedAt }))
    );
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
