import { requireAdminApi } from "@/lib/admin";
import { syncResults } from "@/lib/sync";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const summary = await syncResults();
  if (summary.scoreRows > 0) revalidateTag("weekend-scores");
  return NextResponse.json({ ok: true, ...summary });
}
