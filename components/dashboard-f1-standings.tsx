import { fetchF1DriverStandings } from "@/lib/jolpi";
import { F1Standings } from "@/components/f1-standings";
import { F1 } from "@/lib/f1-theme";

export function F1StandingsSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-44 rounded" style={{ background: F1.gridLine }} />
          <div className="h-3 w-32 rounded" style={{ background: F1.gridLine }} />
        </div>
        <div className="h-3 w-10 rounded" style={{ background: F1.gridLine }} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-5 rounded" style={{ background: F1.gridLine }} />
            <div className="h-2 w-2 rounded-full" style={{ background: F1.gridLine }} />
            <div className="h-3 w-24 rounded" style={{ background: F1.gridLine }} />
            <div className="h-1.5 flex-1 rounded-full" style={{ background: F1.gridLine }} />
            <div className="h-3 w-8 rounded" style={{ background: F1.gridLine }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function DashboardF1Standings() {
  const standings = await fetchF1DriverStandings(new Date().getUTCFullYear());

  return (
    <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
            F1 Driver Championship
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: F1.carbonLight }}>
            Official {new Date().getUTCFullYear()} standings
          </p>
        </div>
        <span className="text-xs font-medium" style={{ color: F1.carbonLight }}>
          Top 10
        </span>
      </div>
      <F1Standings standings={standings} variant="chicane" />
    </section>
  );
}
