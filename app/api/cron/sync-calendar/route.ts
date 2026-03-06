import { assertCronAuthorized } from "@/lib/cron-auth";
import { syncCalendar } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  await syncCalendar();
  return NextResponse.json({ ok: true });
}
