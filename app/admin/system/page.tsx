import Link from "next/link";
import { assertAdmin } from "@/lib/admin";
import { getAdminOperationsData } from "@/lib/admin-operations";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AdminSystemDashboard } from "@/components/admin-system-dashboard";
import { F1 } from "@/lib/f1-theme";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  await assertAdmin();

  const [operationsResult, healthResult] = await Promise.allSettled([
    getAdminOperationsData(),
    getSupabaseAdmin().rpc("admin_scoring_health")
  ]);

  const healthData =
    healthResult.status === "fulfilled" && healthResult.value.data
      ? (healthResult.value.data as {
          pendingSessions: number;
          aggregateMismatches: number;
        })
      : null;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
              Operations
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">System health</h1>
            <p className="mt-1 text-sm text-white/60">
              Automation, provider fetches, publication, and scoring in one place
            </p>
          </div>
          <Link
            href="/admin"
            className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-90"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: F1.white }}
          >
            ← Admin
          </Link>
        </div>
      </div>

      {operationsResult.status === "fulfilled" ? (
        <AdminSystemDashboard
          data={operationsResult.value}
          scoringHealth={{
            available: Boolean(healthData),
            pendingSessions: healthData?.pendingSessions ?? 0,
            aggregateMismatches: healthData?.aggregateMismatches ?? 0
          }}
        />
      ) : (
        <section className="rounded-2xl bg-white p-5" style={{ boxShadow: F1.cardShadow }}>
          <h2 className="font-bold" style={{ color: F1.red }}>
            System telemetry is unavailable
          </h2>
          <p className="mt-2 text-sm" style={{ color: F1.carbonLight }}>
            {String(operationsResult.reason)}
          </p>
        </section>
      )}
    </div>
  );
}
