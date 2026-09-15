import { requireAdminApi } from "@/lib/admin";
import { recomputeAllScores, recomputeRaceScores } from "@/lib/recompute";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ raceId: z.string().min(1).optional() });

export async function POST(request: Request) {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  try {
    const rawBody = await request.text();
    let requestBody: unknown = {};
    try {
      requestBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = requestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid race ID" }, { status: 400 });
    }
    const result = parsed.data.raceId
      ? await recomputeRaceScores(parsed.data.raceId)
      : await recomputeAllScores();
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
