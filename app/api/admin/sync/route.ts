import { assertAdmin } from "@/lib/admin";
import { syncResults } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await assertAdmin();
  await syncResults();
  return NextResponse.json({ ok: true });
}
