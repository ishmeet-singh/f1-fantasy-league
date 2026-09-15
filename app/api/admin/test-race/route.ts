import { requireAdminApi } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { eligibleDriverIdsForRace } from "@/lib/race-driver-eligibility";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const TEST_RACE_ID = "test-race-2099";
const requestSchema = z.object({ action: z.enum(["create", "clear"]) });

export async function POST(req: Request) {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "action must be create or clear" }, { status: 400 });
  }
  const { action } = parsed.data;
  const supabase = getSupabaseAdmin();

  if (action === "clear") {
    const { error } = await supabase.from("race_weekends").delete().eq("id", TEST_RACE_ID);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    revalidateTag("race-weekends");
    revalidateTag("weekend-scores");
    revalidateTag("race-completions");
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

  const eligibleIds = eligibleDriverIdsForRace(TEST_RACE_ID);
  const { data: drivers, error: driversError } = await supabase
    .from("drivers")
    .select("id,name,team")
    .in("id", [...eligibleIds]);
  if (driversError) return NextResponse.json({ error: driversError.message }, { status: 400 });
  const { error: entriesError } = await supabase.rpc("replace_race_entries", {
    p_race_id: TEST_RACE_ID,
    p_entries: (drivers ?? []).map((driver) => ({
      driver_id: driver.id,
      driver_name: driver.name,
      team: driver.team
    }))
  });
  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 400 });

  revalidateTag("race-weekends");
  return NextResponse.json({ ok: true, action: "created", raceId: TEST_RACE_ID });
}
