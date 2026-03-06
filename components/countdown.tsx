"use client";

import { useEffect, useState } from "react";

function calcParts(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSecs = Math.floor(ms / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { d, h, m, s };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Countdown({ target, label = "Qualifying in" }: { target: string; label?: string }) {
  const [parts, setParts] = useState(() => calcParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(calcParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!parts) {
    return <span className="text-slate-400 text-sm">Session started</span>;
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-end gap-1 font-mono">
        {parts.d > 0 && (
          <>
            <span className="text-3xl font-bold text-white">{parts.d}</span>
            <span className="text-slate-400 text-sm mb-1 mr-1">d</span>
          </>
        )}
        <span className="text-3xl font-bold text-white">{pad(parts.h)}</span>
        <span className="text-slate-400 text-sm mb-1">h</span>
        <span className="text-3xl font-bold text-white">{pad(parts.m)}</span>
        <span className="text-slate-400 text-sm mb-1">m</span>
        {parts.d === 0 && (
          <>
            <span className="text-3xl font-bold text-red-400">{pad(parts.s)}</span>
            <span className="text-slate-400 text-sm mb-1">s</span>
          </>
        )}
      </div>
    </div>
  );
}
