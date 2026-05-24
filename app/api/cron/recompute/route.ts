import { assertCronAuthorized } from "@/lib/cron-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { startCronRun, endCronRun } from "@/lib/cron-log";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const runId = await startCronRun("recompute");
  try {
    const result = await recomputeAllScores();
    if (result.errors.length) {
      await endCronRun(runId, "error", { error: result.errors.join("; ") });
      return NextResponse.json({ ok: false, ...result }, { status: 500 });
    }
    await endCronRun(runId, "ok");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("recompute cron error:", err);
    await endCronRun(runId, "error", { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
