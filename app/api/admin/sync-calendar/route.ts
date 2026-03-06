import { assertAdmin } from "@/lib/admin";
import { syncCalendar } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await assertAdmin();
  await syncCalendar();
  return NextResponse.json({ ok: true });
}
