import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getPersonalStats } from "@/lib/data";

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getPersonalStats(user.id);
  return NextResponse.json(stats);
}
