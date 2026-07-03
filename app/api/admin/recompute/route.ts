import { requireAdminApi } from "@/lib/admin";
import { recomputeAllScores } from "@/lib/recompute";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const result = await recomputeAllScores();
  if (result.errors.length) {
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result });
}
