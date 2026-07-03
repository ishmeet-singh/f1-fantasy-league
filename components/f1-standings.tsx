import type { F1DriverStanding } from "@/lib/jolpi";
import { F1 } from "@/lib/f1-theme";

const TEAM_COLORS: Record<string, string> = {
  McLaren: "bg-orange-500",
  "Red Bull": "bg-blue-700",
  "Red Bull Racing": "bg-blue-700",
  Ferrari: "bg-red-600",
  Mercedes: "bg-teal-500",
  "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500",
  Alpine: "bg-pink-500",
  Williams: "bg-sky-500",
  "Racing Bulls": "bg-indigo-500",
  "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400",
  Haas: "bg-slate-400",
  Sauber: "bg-lime-500",
  "Kick Sauber": "bg-lime-500"
};

export function F1Standings({
  standings,
  variant = "dark"
}: {
  standings: F1DriverStanding[];
  variant?: "dark" | "chicane";
}) {
  if (!standings.length) {
    return (
      <p
        className="py-4 text-center text-sm"
        style={{ color: variant === "chicane" ? F1.carbonLight : undefined }}
      >
        Official standings available after Round 1
      </p>
    );
  }

  const maxPoints = Number(standings[0]?.points ?? 1);
  const isChicane = variant === "chicane";

  return (
    <div className="space-y-1.5">
      {standings.slice(0, 10).map((s) => {
        const team = s.Constructors?.[0]?.name ?? "";
        const dotClass = TEAM_COLORS[team] ?? "bg-slate-600";
        const pts = Number(s.points);
        const pct = maxPoints > 0 ? Math.round((pts / maxPoints) * 100) : 0;

        return (
          <div key={s.Driver.driverId} className="flex items-center gap-2 text-sm">
            <span
              className="w-5 shrink-0 text-right font-mono text-xs"
              style={{ color: isChicane ? F1.carbonLight : undefined }}
            >
              {s.position}
            </span>
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
            <span
              className="w-24 shrink-0 truncate"
              style={{ color: isChicane ? F1.carbon : undefined }}
            >
              {s.Driver.code ?? s.Driver.familyName}
            </span>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: isChicane ? F1.offWhite : undefined }}
            >
              <div
                className={`h-full rounded-full ${dotClass} opacity-70`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className="w-8 shrink-0 text-right font-mono text-xs"
              style={{ color: isChicane ? F1.carbon : undefined }}
            >
              {pts}
            </span>
          </div>
        );
      })}
    </div>
  );
}
