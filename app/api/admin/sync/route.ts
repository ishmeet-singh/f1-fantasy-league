import { requireAdminApi } from "@/lib/admin";
import { syncResults } from "@/lib/sync";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  try {
    const summary = await syncResults();
    revalidateTag("weekend-scores");
    revalidateTag("race-completions");
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("admin sync error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
