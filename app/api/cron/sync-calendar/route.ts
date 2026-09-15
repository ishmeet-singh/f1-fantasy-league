import { assertCronAuthorized } from "@/lib/cron-auth";
import { syncCalendar } from "@/lib/sync";
import { startCronRun, endCronRun } from "@/lib/cron-log";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const runId = await startCronRun("sync-calendar");
  try {
    await syncCalendar();
    await endCronRun(runId, "ok");
    revalidateTag("race-weekends");
    revalidateTag("drivers");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sync-calendar cron error:", err);
    await endCronRun(runId, "error", { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
