import { requireUserApi } from "@/lib/request-user";
import { savePicks } from "@/lib/save-picks";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  raceId: z.string().min(1),
  eventType: z.enum(["quali", "sprint", "race"]),
  picks: z.record(z.string())
});

export async function POST(req: Request) {
  const user = requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = schema.parse(await req.json());
  const result = await savePicks({
    userId: user.id,
    raceId: body.raceId,
    eventType: body.eventType,
    picks: body.picks
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
