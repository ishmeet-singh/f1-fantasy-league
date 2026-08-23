import { assertCronAuthorized } from "@/lib/cron-auth";
import { recomputeAllScores, recomputeRaceScores } from "@/lib/recompute";
import { startCronRun, endCronRun } from "@/lib/cron-log";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const runId = await startCronRun("recompute");
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get("raceId");
    const result = raceId
      ? await recomputeRaceScores(raceId, { acceptAvailableResults: true })
      : await recomputeAllScores();
    if (result.errors.length) {
      await endCronRun(runId, "error", { error: result.errors.join("; "), summary: { ...result } });
      return NextResponse.json({ ok: false, ...result }, { status: 500 });
    }
    await endCronRun(runId, "ok", { summary: { ...result } });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("recompute cron error:", err);
    await endCronRun(runId, "error", { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
