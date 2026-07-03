import { requireAdminApi } from "@/lib/admin";
import { syncCalendar } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  await syncCalendar();
  return NextResponse.json({ ok: true });
}
