"use client";

import { useRouter, usePathname } from "next/navigation";
import { F1 } from "@/lib/f1-theme";
import type { Route } from "next";

type RaceItem = {
  id: string;
  grand_prix: string;
  round: number;
  isPast: boolean;
  hasResults: boolean;
};

function shortGP(name: string) {
  return name.replace(" Grand Prix", "").replace("Grand Prix", "").trim();
}

export function ResultsRaceSelector({
  races,
  selectedRaceId
}: {
  races: RaceItem[];
  selectedRaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function select(raceId: string) {
    router.push(`${pathname}?race=${raceId}` as Route);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {races.map((r) => {
        const selected = r.id === selectedRaceId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => select(r.id)}
            className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition active:opacity-80"
            style={
              selected
                ? { background: F1.red, borderColor: F1.red, color: F1.white }
                : r.hasResults
                  ? { background: F1.white, borderColor: F1.carbonMid, color: F1.carbon }
                  : r.isPast
                    ? { background: "#EEE", borderColor: F1.gridLine, color: F1.carbonLight }
                    : { background: F1.white, borderColor: F1.gridLine, color: F1.carbonMid }
            }
          >
            <span className="block text-[10px] font-bold opacity-70">R{r.round}</span>
            <span className="block max-w-[72px] text-center leading-tight">{shortGP(r.grand_prix)}</span>
            {r.hasResults && !selected && (
              <span
                className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full"
                style={{ background: "#166534" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
