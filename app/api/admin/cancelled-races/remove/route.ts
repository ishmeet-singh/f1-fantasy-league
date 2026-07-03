import { requireAdminApi } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listCancelledRaceRowsInDb, removeCancelledRacesFromDb } from "@/lib/remove-cancelled-races";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ confirm: z.literal(true) });

/**
 * POST /api/admin/cancelled-races/remove
 * Body: { "confirm": true } — deletes only known cancelled race_weekends rows.
 */
export async function POST(req: Request) {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  schema.parse(await req.json());

  const supabase = getSupabaseAdmin();
  const preview = await listCancelledRaceRowsInDb(supabase);
  const inDb = preview.filter((r) => r.source === "database");

  if (!inDb.length) {
    return NextResponse.json({ ok: true, deleted: 0, message: "No cancelled race rows in database" });
  }

  const result = await removeCancelledRacesFromDb(supabase);
  return NextResponse.json({ ok: true, deleted: result.deleted, removed: inDb });
}
