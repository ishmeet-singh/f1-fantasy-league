import { requireAdminApi } from "@/lib/admin";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await recomputeAllScores();
    if (result.errors.length) {
      return NextResponse.json({ ok: false, ...result }, { status: 500 });
    }
    revalidateTag("weekend-scores");
    revalidateTag("race-completions");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("admin recompute error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
