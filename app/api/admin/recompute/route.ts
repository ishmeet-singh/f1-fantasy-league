import { assertAdmin } from "@/lib/admin";
import { recomputeAllScores } from "@/lib/recompute";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await assertAdmin();
  await recomputeAllScores();
  return NextResponse.json({ ok: true });
}
