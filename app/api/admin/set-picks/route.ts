import { requireAdminApi } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { savePicks } from "@/lib/save-picks";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  raceId: z.string().min(1),
  eventType: z.enum(["quali", "sprint", "race"]),
  picks: z.record(z.string()),
  /** Optional ISO timestamp for when they “submitted” (e.g. before quali lock) */
  submittedAt: z.string().optional()
});

export async function POST(req: Request) {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const body = schema.parse(await req.json());
  const admin = getSupabaseAdmin();

  const { data: player } = await admin
    .from("users")
    .select("id,email")
    .eq("email", body.email.toLowerCase())
    .maybeSingle();

  if (!player) {
    return NextResponse.json({ error: `No user with email ${body.email}` }, { status: 404 });
  }

  const result = await savePicks({
    userId: player.id,
    raceId: body.raceId,
    eventType: body.eventType,
    picks: body.picks,
    skipLockCheck: true,
    createdAt: body.submittedAt
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: player.id, email: player.email });
}
