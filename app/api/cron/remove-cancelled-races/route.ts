import { assertCronAuthorized } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  listCancelledRaceRowsInDb,
  removeCancelledRacesFromDb
} from "@/lib/remove-cancelled-races";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/remove-cancelled-races
 * Deletes Bahrain (1282) and Saudi (1283) from race_weekends. Cron-secret protected.
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const preview = await listCancelledRaceRowsInDb(supabase);
  const inDb = preview.filter((r) => r.source === "database");

  if (!inDb.length) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      message: "No cancelled race rows found in database",
      preview
    });
  }

  const result = await removeCancelledRacesFromDb(supabase);
  return NextResponse.json({
    ok: true,
    deleted: result.deleted,
    removed: inDb
  });
}
