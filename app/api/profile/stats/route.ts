import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/request-user";
import { getPersonalStats } from "@/lib/data";

export async function GET() {
  const user = requireUserApi();
  if (user instanceof NextResponse) return user;

  const stats = await getPersonalStats(user.id);
  return NextResponse.json(stats);
}
