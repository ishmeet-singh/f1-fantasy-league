"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { ProfileForm } from "@/components/profile-form";
import { F1 } from "@/lib/f1-theme";

type Stats = {
  rank: number;
  totalPoints: number;
  bestWeekend: number;
  exactMatches: number;
  lastRace: { name: string; points: number } | null;
} | null;

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="rounded-2xl px-4 py-5" style={{ background: F1.carbon }}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
            <div className="h-3 w-48 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl" style={{ background: F1.offWhite }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-3" style={{ background: F1.offWhite, border: `1px solid ${F1.gridLine}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
        {label}
      </p>
      <p
        className="mt-1 text-lg font-bold tabular-nums"
        style={{ color: accent ? F1.red : F1.carbon }}
      >
        {value}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      setEmail(user.email || "");

      const [profileRes, statsRes] = await Promise.all([
        fetch("/api/profile/me"),
        fetch("/api/profile/stats")
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setDisplayName(p.display_name || "");
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
      setLoading(false);
    }
    load();
  }, []);

  const initials = (displayName || email || "?").slice(0, 2).toUpperCase();
  const rankColor =
    stats && stats.rank <= 3 ? F1.podium[stats.rank - 1] : F1.red;

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
          Account
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Your profile</h1>

        <div className="mt-4 flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={{ background: F1.redLight, color: F1.red, border: `2px solid ${F1.red}` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{displayName || "Player"}</p>
            <p className="truncate text-sm text-white/60">{email}</p>
            {stats && (
              <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: rankColor }}>
                P{stats.rank} · {stats.totalPoints} pts
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
            Season stats
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Rank" value={`#${stats.rank}`} accent />
            <StatCard label="Total points" value={String(stats.totalPoints)} />
            <StatCard label="Best weekend" value={`${stats.bestWeekend} pts`} />
            <StatCard label="Exact hits" value={String(stats.exactMatches)} />
          </div>
          {stats.lastRace && (
            <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: F1.gridLine, color: F1.carbonLight }}>
              Last scored:{" "}
              <span className="font-medium" style={{ color: F1.carbon }}>
                {stats.lastRace.name}
              </span>
              {" · "}
              <span className="font-semibold" style={{ color: F1.red }}>
                {stats.lastRace.points} pts
              </span>
            </p>
          )}
        </section>
      ) : (
        <section
          className="rounded-2xl bg-white p-4 text-sm"
          style={{ boxShadow: F1.cardShadow, color: F1.carbonLight }}
        >
          No race scores yet — make your first picks to see stats here.
        </section>
      )}

      <ProfileForm initialName={displayName} onSaved={(name) => setDisplayName(name)} />
    </>
  );
}
