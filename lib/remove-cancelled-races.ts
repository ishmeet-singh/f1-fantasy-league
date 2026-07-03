import type { SupabaseClient } from "@supabase/supabase-js";
import { CANCELLED_RACE_IDS, CANCELLED_RACES_2026 } from "@/lib/cancelled-races";

export type CancelledRaceRow = {
  id: string;
  grand_prix: string;
  race_start: string;
  source: "database" | "expected";
};

/** Rows in race_weekends that match known cancelled IDs (plus expected metadata). */
export async function listCancelledRaceRowsInDb(
  supabase: SupabaseClient
): Promise<CancelledRaceRow[]> {
  const { data } = await supabase
    .from("race_weekends")
    .select("id,grand_prix,race_start")
    .in("id", [...CANCELLED_RACE_IDS]);

  const byId = new Map((data ?? []).map((r) => [r.id, r]));

  return CANCELLED_RACES_2026.map((expected) => {
    const row = byId.get(expected.id);
    if (row) {
      return {
        id: row.id,
        grand_prix: row.grand_prix,
        race_start: row.race_start,
        source: "database" as const
      };
    }
    return { ...expected, source: "expected" as const };
  });
}

/** Delete cancelled race_weekends rows and return how many were removed. */
export async function removeCancelledRacesFromDb(supabase: SupabaseClient): Promise<{
  deleted: number;
  ids: string[];
}> {
  const ids = [...CANCELLED_RACE_IDS];
  const { data, error } = await supabase
    .from("race_weekends")
    .delete()
    .in("id", ids)
    .select("id");

  if (error) throw new Error(error.message);
  return { deleted: data?.length ?? 0, ids };
}
