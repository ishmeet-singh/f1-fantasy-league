"use client";

import Link from "next/link";
import { useState } from "react";

export function PreviewScreenNav({
  design,
  screen,
  onScreen,
  accent = "default"
}: {
  design: string;
  screen: "dashboard" | "picks";
  onScreen: (s: "dashboard" | "picks") => void;
  accent?: "default" | "f1";
}) {
  const activeBg = accent === "f1" ? "bg-[#D31411]" : "bg-zinc-900";
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <Link href="/preview" className="text-xs font-medium text-zinc-500 hover:text-zinc-800">
          ← Previews
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{design}</span>
      </div>
      <div className="mx-auto flex max-w-lg gap-1 px-4 pb-3">
        {(["dashboard", "picks"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onScreen(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${
              screen === s ? `${activeBg} text-white` : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </header>
  );
}

export function MiniLineChart({
  races,
  lines,
  className = ""
}: {
  races: string[];
  lines: { name: string; color: string; values: number[] }[];
  className?: string;
}) {
  const max = Math.max(...lines.flatMap((l) => l.values));
  const w = 320;
  const h = 120;
  const pad = 8;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-hidden>
        {lines.map((line) => {
          const pts = line.values
            .map((v, i) => {
              const x = pad + (i / (races.length - 1)) * (w - pad * 2);
              const y = h - pad - (v / max) * (h - pad * 2);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={line.name}
              fill="none"
              stroke={line.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {lines.map((l) => (
          <span key={l.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-zinc-400">
        Raw cumulative race scores — standings use best-4-of-8 with drops.
      </p>
    </div>
  );
}

export function usePreviewScreen(defaultScreen: "dashboard" | "picks" = "dashboard") {
  return useState<"dashboard" | "picks">(defaultScreen);
}
