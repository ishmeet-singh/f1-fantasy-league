import { fetchF1DriverStandings } from "@/lib/jolpi";
import { F1Standings } from "@/components/f1-standings";
import { perfLog, timeAsync } from "@/lib/perf-investigate";

export function F1StandingsSkeleton() {
  return (
    <div className="card space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-44 bg-slate-800 rounded" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
        <div className="h-3 w-10 bg-slate-800 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-5 bg-slate-800 rounded" />
            <div className="h-2 w-2 rounded-full bg-slate-800" />
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full" />
            <div className="h-3 w-8 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function DashboardF1Standings() {
  const { result: standings, ms } = await timeAsync("jolpi_driver_standings", () =>
    fetchF1DriverStandings(new Date().getUTCFullYear())
  );
  perfLog("dashboard_f1_standings_stream", { ms });

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">F1 Driver Championship</h3>
          <p className="text-xs text-slate-500 mt-0.5">Official {new Date().getUTCFullYear()} standings</p>
        </div>
        <span className="text-xs text-slate-600">Top 10</span>
      </div>
      <F1Standings standings={standings} />
    </div>
  );
}
