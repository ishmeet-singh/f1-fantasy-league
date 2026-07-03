import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AdminPanel } from "@/components/admin-panel";
import { F1 } from "@/lib/f1-theme";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const [{ data: users }, { data: upcomingRaces }, { data: allRaces }, { data: drivers }] =
    await Promise.all([
      supabase.from("users").select("id,email,display_name,created_at").order("created_at", { ascending: true }),
      supabase.from("race_weekends").select("id,grand_prix,race_start,has_sprint")
        .gte("race_start", new Date().toISOString())
        .order("race_start", { ascending: true })
        .limit(5),
      supabase.from("race_weekends").select("id,grand_prix,race_start,has_sprint").order("race_start", {
        ascending: true
      }),
      supabase.from("drivers").select("id,name,team").order("name")
    ]);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
              F1 Fantasy League
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-white/60">
              {(users || []).length} player{(users || []).length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Link
            href="/admin/picks"
            className="shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ borderColor: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: F1.white }}
          >
            Pick monitor →
          </Link>
        </div>
      </div>

      <AdminPanel
        initialPlayers={users || []}
        upcomingRaces={upcomingRaces || []}
        allRaces={allRaces || []}
        drivers={drivers || []}
      />
    </>
  );
}
