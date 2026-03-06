import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const TEST_RACE_ID = "test-race-2099";

export async function POST(req: Request) {
  await assertAdmin();
  const { action } = await req.json();
  const supabase = getSupabaseAdmin();

  if (action === "clear") {
    await supabase.from("predictions").delete().eq("race_id", TEST_RACE_ID);
    await supabase.from("results").delete().eq("race_id", TEST_RACE_ID);
    await supabase.from("scores").delete().eq("race_id", TEST_RACE_ID);
    await supabase.from("weekend_scores").delete().eq("race_id", TEST_RACE_ID);
    await supabase.from("race_weekends").delete().eq("id", TEST_RACE_ID);
    return NextResponse.json({ ok: true, action: "cleared" });
  }

  // action === "create"
  const now = new Date();
  const qualiStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h from now (window already open)
  const raceStart = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6h from now

  const { error } = await supabase.from("race_weekends").upsert({
    id: TEST_RACE_ID,
    grand_prix: "🧪 Test Race (Demo)",
    race_date: raceStart.toISOString(),
    quali_start: qualiStart.toISOString(),
    sprint_start: null,
    race_start: raceStart.toISOString(),
    has_sprint: false
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, action: "created", raceId: TEST_RACE_ID });
}
