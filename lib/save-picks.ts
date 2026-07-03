import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { EventType } from "@/lib/types";

const sizeByEvent = { quali: 3, sprint: 10, race: 10 } as const;
const WINDOW_HOURS = 48;

export type SavePicksInput = {
  userId: string;
  raceId: string;
  eventType: EventType;
  picks: Record<string, string>;
  /** Admin backfill: skip window / lock / results checks */
  skipLockCheck?: boolean;
  /** Admin backfill: preserve or set first-submitted timestamp */
  createdAt?: string;
};

export async function savePicks(input: SavePicksInput): Promise<{ ok: true } | { error: string }> {
  const admin = getSupabaseAdmin();
  const maxSize = sizeByEvent[input.eventType];

  const { data: race } = await admin
    .from("race_weekends")
    .select("quali_start,sprint_start,race_start,has_sprint")
    .eq("id", input.raceId)
    .single();

  if (!race) return { error: "Race not found" };

  if (input.eventType === "sprint" && !race.has_sprint) {
    return { error: "No sprint for this race" };
  }

  if (!input.skipLockCheck) {
    const deadline =
      input.eventType === "quali"
        ? race.quali_start
        : input.eventType === "sprint"
          ? race.sprint_start
          : race.race_start;

    if (!deadline) return { error: "Session not found" };

    const sessionWindowOpenAt = new Date(new Date(deadline).getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    if (new Date() < sessionWindowOpenAt) {
      return { error: "Picks window has not opened yet for this session" };
    }

    if (new Date(deadline) <= new Date()) {
      return { error: "Locked — session has started" };
    }

    const { data: existingResults } = await admin
      .from("results")
      .select("id")
      .eq("race_id", input.raceId)
      .eq("event_type", input.eventType)
      .limit(1)
      .maybeSingle();

    if (existingResults) {
      return { error: "Locked — results already published for this session" };
    }
  }

  const entries = Object.entries(input.picks)
    .map(([pos, driverId]) => ({
      user_id: input.userId,
      race_id: input.raceId,
      event_type: input.eventType,
      driver_id: driverId,
      predicted_position: Number(pos)
    }))
    .filter((r) => r.driver_id)
    .filter(
      (r) =>
        Number.isInteger(r.predicted_position) &&
        r.predicted_position >= 1 &&
        r.predicted_position <= maxSize
    );

  if (entries.length !== maxSize) {
    return { error: `Exactly ${maxSize} picks required` };
  }

  const uniqueDrivers = new Set(entries.map((e) => e.driver_id));
  if (uniqueDrivers.size !== entries.length) {
    return { error: "Duplicate drivers not allowed" };
  }

  const { data: existing } = await admin
    .from("predictions")
    .select("created_at")
    .eq("user_id", input.userId)
    .eq("race_id", input.raceId)
    .eq("event_type", input.eventType)
    .limit(1)
    .maybeSingle();

  const firstSubmittedAt = input.createdAt ?? existing?.created_at ?? new Date().toISOString();
  const nowIso = new Date().toISOString();

  await admin
    .from("predictions")
    .delete()
    .eq("user_id", input.userId)
    .eq("race_id", input.raceId)
    .eq("event_type", input.eventType);

  const withTimestamps = entries.map((e) => ({
    ...e,
    created_at: firstSubmittedAt,
    updated_at: nowIso
  }));
  let { error } = await admin.from("predictions").insert(withTimestamps);
  if (error?.message?.includes("updated_at")) {
    const fallback = await admin.from("predictions").insert(
      entries.map((e) => ({ ...e, created_at: firstSubmittedAt }))
    );
    error = fallback.error;
  }
  if (error) return { error: error.message };

  return { ok: true };
}
