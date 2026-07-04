import type { EventType } from "@/lib/types";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

export const PICKS_REQUIRED: Record<EventType, number> = {
  quali: 3,
  sprint: 10,
  race: 10
};

/** User IDs with a full pick set for this session (not just one row). */
export function usersWithCompletePicks(
  rows: { user_id: string }[],
  eventType: EventType
): Set<string> {
  const required = PICKS_REQUIRED[eventType];
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count >= required).map(([id]) => id)
  );
}

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/** Authoritative per-user check immediately before sending a reminder. */
export async function userHasCompletePicks(
  supabase: AdminClient,
  userId: string,
  raceId: string,
  eventType: EventType
): Promise<boolean> {
  const { count, error } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("race_id", raceId)
    .eq("event_type", eventType);

  if (error) {
    console.error(`userHasCompletePicks failed for ${userId} ${raceId} ${eventType}:`, error);
    // Fail closed — do not email if we cannot verify submission state.
    return true;
  }

  return (count ?? 0) >= PICKS_REQUIRED[eventType];
}
