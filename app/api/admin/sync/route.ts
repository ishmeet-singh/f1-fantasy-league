import { requireAdminApi } from "@/lib/admin";
import { syncResults } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  await syncResults();
  return NextResponse.json({ ok: true });
}
