/**
 * One-off: delete cancelled 2026 race_weekends rows (1282 Bahrain, 1283 Saudi).
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import { createClient } from "@supabase/supabase-js";

const CANCELLED_IDS = ["1282", "1283"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: preview, error: previewErr } = await supabase
  .from("race_weekends")
  .select("id,grand_prix,race_start")
  .in("id", CANCELLED_IDS);

if (previewErr) {
  console.error("Preview failed:", previewErr.message);
  process.exit(1);
}

console.log("Rows to delete:");
for (const row of preview ?? []) {
  console.log(`  ${row.id} | ${row.grand_prix} | ${row.race_start}`);
}

if (!preview?.length) {
  console.log("Nothing to delete — already clean.");
  process.exit(0);
}

const { data: deleted, error: deleteErr } = await supabase
  .from("race_weekends")
  .delete()
  .in("id", CANCELLED_IDS)
  .select("id");

if (deleteErr) {
  console.error("Delete failed:", deleteErr.message);
  process.exit(1);
}

console.log(`Deleted ${deleted?.length ?? 0} row(s):`, deleted?.map((r) => r.id).join(", "));
