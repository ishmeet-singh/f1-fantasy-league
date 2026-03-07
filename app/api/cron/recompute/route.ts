import { assertCronAuthorized } from "@/lib/cron-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    await recomputeAllScores();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("recompute cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
