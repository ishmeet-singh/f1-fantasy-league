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
  eventType: EventType,
  onDebug?: (result: { count: number | null; error: string | null; required: number }) => void
): Promise<boolean> {
  const { count, error } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("race_id", raceId)
    .eq("event_type", eventType);

  onDebug?.({
    count,
    error: error?.message ?? null,
    required: PICKS_REQUIRED[eventType]
  });
  // #region agent log
  fetch('http://127.0.0.1:7820/ingest/3bd84e93-aaff-4326-99b7-c8986e7670c1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cb6273'},body:JSON.stringify({sessionId:'cb6273',runId:`${raceId}-${eventType}`,hypothesisId:'H3',location:'lib/reminder-submission.ts:47',message:'Per-user prediction count result',data:{raceId,eventType,count,error:error?.message??null,required:PICKS_REQUIRED[eventType]},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error(`userHasCompletePicks failed for ${userId} ${raceId} ${eventType}:`, error);
    // Fail closed — do not email if we cannot verify submission state.
    return true;
  }

  return (count ?? 0) >= PICKS_REQUIRED[eventType];
}
