"use client";

import { useRouter, usePathname } from "next/navigation";
import type { Route } from "next";

type RaceItem = {
  id: string;
  grand_prix: string;
  round: number;
  isWindowOpen: boolean;
  isRaceDone: boolean;
};

function shortGP(name: string): string {
  return name.replace(" Grand Prix", "").replace("Grand Prix", "").trim();
}

export function PicksRaceSelector({
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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
      {races.map((r) => {
        const selected = r.id === selectedRaceId;
        return (
          <button
            key={r.id}
            onClick={() => select(r.id)}
            className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              selected
                ? "bg-red-600 border-red-500 text-white"
                : r.isWindowOpen && !r.isRaceDone
                ? "bg-emerald-900/30 border-emerald-800/60 text-emerald-300 hover:border-emerald-700"
                : r.isRaceDone
                ? "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                : "bg-slate-900/50 border-slate-800/50 text-slate-600 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] opacity-60">R{r.round}</span>
            <span className="max-w-[72px] text-center leading-tight">
              {shortGP(r.grand_prix)}
            </span>
            {r.isWindowOpen && !r.isRaceDone && !selected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}
