import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listCancelledRaceRowsInDb } from "@/lib/remove-cancelled-races";
import { NextResponse } from "next/server";

/** GET /api/admin/cancelled-races/preview — rows slated for removal */
export async function GET() {
  await assertAdmin();
  const supabase = getSupabaseAdmin();
  const rows = await listCancelledRaceRowsInDb(supabase);
  return NextResponse.json({ rows });
}
