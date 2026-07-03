"use client";

import { F1 } from "@/lib/f1-theme";
import { useRaceNav } from "@/lib/use-race-nav";
import { useScrollRacePill } from "@/lib/use-scroll-race-pill";

type RaceItem = {
  id: string;
  grand_prix: string;
  round: number;
  isWindowOpen: boolean;
  isRaceDone: boolean;
};

function shortGP(name: string) {
  return name.replace(" Grand Prix", "").replace("Grand Prix", "").trim();
}

export function PicksRaceSelector({
  races,
  selectedRaceId
}: {
  races: RaceItem[];
  selectedRaceId: string;
}) {
  const { navigate, pendingRaceId, isNavigating } = useRaceNav(selectedRaceId);
  const { containerRef, selectedRef } = useScrollRacePill(selectedRaceId);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-1 scroll-smooth"
      style={{ opacity: isNavigating ? 0.85 : 1 }}
    >
      {races.map((r) => {
        const selected = r.id === selectedRaceId;
        const open = r.isWindowOpen && !r.isRaceDone;
        const loading = pendingRaceId === r.id;
        return (
          <button
            key={r.id}
            ref={selected ? selectedRef : undefined}
            type="button"
            onClick={() => navigate(r.id)}
            disabled={loading}
            className="relative shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition active:opacity-80 disabled:cursor-wait"
            style={
              selected
                ? { background: F1.red, borderColor: F1.red, color: F1.white }
                : open
                  ? { background: F1.white, borderColor: F1.red, color: F1.carbon }
                  : r.isRaceDone
                    ? { background: "#EEE", borderColor: F1.gridLine, color: F1.carbonLight }
                    : { background: F1.white, borderColor: F1.gridLine, color: F1.carbonMid }
            }
          >
            <span className="block text-[10px] font-bold opacity-70">R{r.round}</span>
            <span className="block max-w-[72px] text-center leading-tight">{shortGP(r.grand_prix)}</span>
            {loading ? (
              <span className="mx-auto mt-1 block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
            ) : (
              open &&
              !selected && (
                <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full" style={{ background: F1.red }} />
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
