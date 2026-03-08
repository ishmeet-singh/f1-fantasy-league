import type { F1DriverStanding } from "@/lib/jolpi";

const TEAM_COLORS: Record<string, string> = {
  "McLaren": "bg-orange-500", "Red Bull": "bg-blue-700", "Red Bull Racing": "bg-blue-700",
  "Ferrari": "bg-red-600", "Mercedes": "bg-teal-500", "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500", "Alpine": "bg-pink-500", "Williams": "bg-sky-500",
  "Racing Bulls": "bg-indigo-500", "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400", "Haas": "bg-slate-400",
  "Sauber": "bg-lime-500", "Kick Sauber": "bg-lime-500",
};

export function F1Standings({ standings }: { standings: F1DriverStanding[] }) {
  if (!standings.length) {
    return (
      <p className="text-slate-600 text-sm text-center py-4">
        Official standings available after Round 1
      </p>
    );
  }

  const maxPoints = Number(standings[0]?.points ?? 1);

  return (
    <div className="space-y-1.5">
      {standings.slice(0, 10).map(s => {
        const team = s.Constructors?.[0]?.name ?? "";
        const dotClass = TEAM_COLORS[team] ?? "bg-slate-600";
        const pts = Number(s.points);
        const pct = maxPoints > 0 ? Math.round((pts / maxPoints) * 100) : 0;

        return (
          <div key={s.Driver.driverId} className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 font-mono text-xs w-5 shrink-0 text-right">{s.position}</span>
            <span className={`inline-block w-2 h-2 rounded-full ${dotClass} shrink-0`} />
            <span className="text-slate-300 w-24 shrink-0 truncate">
              {s.Driver.code ?? s.Driver.familyName}
            </span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${dotClass} opacity-70`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-white text-xs w-8 text-right shrink-0">{pts}</span>
          </div>
        );
      })}
    </div>
  );
}
