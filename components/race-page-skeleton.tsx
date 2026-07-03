import { F1 } from "@/lib/f1-theme";
import type { CSSProperties } from "react";

function Pulse({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded ${className ?? ""}`} style={{ background: F1.gridLine, ...style }} />;
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl px-4 py-5" style={{ background: F1.carbon, boxShadow: F1.headerShadow }}>
      <Pulse className="h-3 w-32" style={{ background: "rgba(255,255,255,0.15)" }} />
      <Pulse className="mt-3 h-6 w-40" style={{ background: "rgba(255,255,255,0.2)" }} />
      <div className="mt-5 flex justify-between gap-4">
        <Pulse className="h-4 w-24" style={{ background: "rgba(255,255,255,0.1)" }} />
        <Pulse className="h-10 w-20" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
    </div>
  );
}

function SelectorSkeleton() {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <Pulse className="mb-3 h-3 w-20" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-14 w-[72px] shrink-0 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <Pulse className="mb-4 h-4 w-28" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Pulse className="h-8 w-8 shrink-0 rounded-xl" />
            <Pulse className="h-4 flex-1" />
            <Pulse className="h-4 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}

function LeagueSkeleton() {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <Pulse className="mb-1 h-4 w-36" />
      <Pulse className="mb-4 h-3 w-56" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Pulse className="h-4 w-4" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-32" />
              <div className="flex gap-1.5">
                <Pulse className="h-5 w-14 rounded-full" />
                <Pulse className="h-5 w-14 rounded-full" />
                <Pulse className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <Pulse className="h-5 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Chicane skeleton for results / picks race navigation. */
export function RacePageSkeleton({ variant = "results" }: { variant?: "results" | "picks" }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <HeroSkeleton />
      <SelectorSkeleton />
      {variant === "results" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={5} />
          </div>
          <LeagueSkeleton />
        </>
      ) : (
        <>
          <CardSkeleton rows={3} />
          <CardSkeleton rows={5} />
        </>
      )}
    </div>
  );
}
