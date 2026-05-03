import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { openF1Get } from "@/lib/openf1";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/fix-driver-names
 *
 * Root cause: syncCalendarOpenF1 calls /v1/drivers?session_key=latest.
 * OpenF1 returns drivers per-session — if full_name is empty for any
 * driver in that session, the upsert overwrites their stored name with "".
 *
 * Fix: fetch all drivers from OpenF1 for the Australian GP race session
 * (where all 22 participated), then update any DB entry with empty/missing name.
 * Also fetch Jolpi's driver list as a cross-reference.
 */
export async function POST() {
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const results: { driver_id: string; old_name: string; new_name: string; source: string }[] = [];
  const errors: string[] = [];

  // 1. Get current state of drivers table
  const { data: dbDrivers } = await supabase.from("drivers").select("id,name,team");
  const badDrivers = (dbDrivers ?? []).filter(d =>
    !d.name || d.name.trim() === "" || d.name === d.id || /^\d+$/.test(d.name)
  );

  if (badDrivers.length === 0) {
    return NextResponse.json({ ok: true, message: "All driver names look correct", fixed: 0 });
  }

  // 2. Fetch from OpenF1 for all sessions in 2026 (get complete driver data)
  const sessionRes = await openF1Get("/v1/sessions?year=2026&session_name=Race");
  const sessions: { session_key: number; meeting_key: number }[] = sessionRes.ok ? await sessionRes.json() : [];

  // Build a map of driver_number -> name from ALL race sessions we have
  const openF1Names = new Map<string, { name: string; team: string }>();

  for (const session of sessions) {
    try {
      const dRes = await openF1Get(`/v1/drivers?session_key=${session.session_key}`);
      if (!dRes.ok) continue;
      const drivers: { driver_number: number; full_name: string; team_name?: string }[] = await dRes.json();
      for (const d of drivers) {
        if (d.full_name && d.full_name.trim() !== "") {
          const key = String(d.driver_number);
          if (!openF1Names.has(key)) {
            openF1Names.set(key, { name: d.full_name, team: d.team_name || "Unknown" });
          }
        }
      }
    } catch (e) {
      errors.push(`Session ${session.session_key}: ${e}`);
    }
  }

  // 3. Fetch Jolpi driver list as additional fallback
  let jolpiDrivers: { driverId: string; givenName: string; familyName: string }[] = [];
  try {
    const jRes = await fetch("https://api.jolpi.ca/ergast/f1/2026/drivers/?limit=100", { next: { revalidate: 0 } });
    if (jRes.ok) {
      const j = await jRes.json();
      jolpiDrivers = j.MRData?.DriverTable?.Drivers ?? [];
    }
  } catch (e) {
    errors.push(`Jolpi fetch: ${e}`);
  }

  // Build last-name -> full-name map from Jolpi
  const jolpiByLastName = new Map<string, string>();
  for (const d of jolpiDrivers) {
    jolpiByLastName.set(d.familyName.toLowerCase(), `${d.givenName} ${d.familyName}`);
    jolpiByLastName.set(d.driverId.toLowerCase(), `${d.givenName} ${d.familyName}`);
    // Handle compound IDs like "max_verstappen"
    const parts = d.driverId.split("_");
    if (parts.length > 1) jolpiByLastName.set(parts[parts.length - 1], `${d.givenName} ${d.familyName}`);
  }

  // 4. Fix each bad driver
  for (const bad of badDrivers) {
    let newName: string | null = null;
    let source = "";

    // Try OpenF1 first (exact driver_number match)
    const of1 = openF1Names.get(bad.id);
    if (of1?.name) {
      newName = of1.name;
      source = "OpenF1";
    }

    // Jolpi fallback: try to match by existing team/partial name context
    // For numeric IDs we can't easily match by name without a reference point,
    // but if the DB has a partial name or the ID matches a known pattern:
    if (!newName) {
      // Try matching driver_number against known Jolpi mappings via any partial data
      // This is a best-effort for drivers OpenF1 didn't return
      const asNum = parseInt(bad.id);
      if (!isNaN(asNum)) {
        // Check if any Jolpi driver name ends with this number pattern
        for (const [key, fullName] of jolpiByLastName) {
          if (key.endsWith(bad.id) || key === bad.id) {
            newName = fullName;
            source = "Jolpi (fuzzy)";
            break;
          }
        }
      }
    }

    if (newName) {
      const { error } = await supabase
        .from("drivers")
        .update({ name: newName, ...(of1?.team ? { team: of1.team } : {}) })
        .eq("id", bad.id);

      if (error) {
        errors.push(`Update failed for ${bad.id}: ${error.message}`);
      } else {
        results.push({ driver_id: bad.id, old_name: bad.name || "", new_name: newName, source });
      }
    } else {
      errors.push(`Could not find name for driver_id: ${bad.id}`);
    }
  }

  return NextResponse.json({
    ok: true,
    badDriversFound: badDrivers.length,
    fixed: results.length,
    results,
    errors: errors.length ? errors : undefined
  });
}
