import { assertCronAuthorized } from "@/lib/cron-auth";
import { syncResults } from "@/lib/sync";
import { startCronRun, endCronRun } from "@/lib/cron-log";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const runId = await startCronRun("sync-results");
  try {
    await syncResults();
    await endCronRun(runId, "ok");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sync-results cron error:", err);
    await endCronRun(runId, "error", { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
