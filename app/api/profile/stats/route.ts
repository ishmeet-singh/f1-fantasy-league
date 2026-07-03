import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getPersonalStats } from "@/lib/data";

export async function GET() {
  const user = getRequestUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getPersonalStats(user.id);
  return NextResponse.json(stats);
}
