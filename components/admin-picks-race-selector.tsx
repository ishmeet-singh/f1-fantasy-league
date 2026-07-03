"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { F1 } from "@/lib/f1-theme";

type RaceItem = {
  id: string;
  grand_prix: string;
  round: number;
  hasPicks: boolean;
};

function shortGP(name: string) {
  return name.replace(" Grand Prix", "").replace("Grand Prix", "").trim();
}

export function AdminPicksRaceSelector({
  races,
  selectedRaceId
}: {
  races: RaceItem[];
  selectedRaceId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scroll = () => {
      const container = containerRef.current;
      const pill = selectedRef.current;
      if (!container || !pill) return;
      container.scrollTo({
        left: pill.offsetLeft - container.offsetLeft,
        behavior: "smooth"
      });
    };
    requestAnimationFrame(scroll);
  }, [selectedRaceId]);

  return (
    <div ref={containerRef} className="flex gap-2 overflow-x-auto pb-1 scroll-smooth">
      {races.map((r) => {
        const selected = r.id === selectedRaceId;
        return (
          <span key={r.id} ref={selected ? selectedRef : undefined} className="shrink-0">
            <Link
              href={`/admin/picks?race=${r.id}`}
              className="block rounded-xl border px-3 py-2 text-xs font-semibold transition active:opacity-80"
              style={
                selected
                  ? { background: F1.red, borderColor: F1.red, color: F1.white }
                  : r.hasPicks
                    ? { background: F1.white, borderColor: F1.carbonMid, color: F1.carbon }
                    : { background: F1.white, borderColor: F1.gridLine, color: F1.carbonMid }
              }
            >
              <span className="block text-[10px] font-bold opacity-70">R{r.round}</span>
              <span className="block max-w-[72px] text-center leading-tight">{shortGP(r.grand_prix)}</span>
              {r.hasPicks && !selected && (
                <span
                  className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full"
                  style={{ background: "#166534" }}
                />
              )}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
