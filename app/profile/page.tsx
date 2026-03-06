"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { ProfileForm } from "@/components/profile-form";

type Stats = {
  rank: number;
  totalPoints: number;
  bestWeekend: number;
  exactMatches: number;
  lastRace: { name: string; points: number } | null;
} | null;

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
      if (!user) { window.location.href = "/"; return; }
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

  if (loading) {
    return (
      <div className="max-w-lg space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-3 w-48 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center text-xl font-bold text-red-400">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-lg">{displayName || "Player"}</p>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Season Stats</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Rank" value={`#${stats.rank}`} accent />
            <StatCard label="Total Points" value={String(stats.totalPoints)} />
            <StatCard label="Best Race" value={`${stats.bestWeekend} pts`} />
            <StatCard label="Exact Hits" value={String(stats.exactMatches)} />
          </div>
          {stats.lastRace && (
            <p className="text-xs text-slate-500 border-t border-slate-800 mt-3 pt-3">
              Last scored:{" "}
              <span className="text-slate-300">{stats.lastRace.name}</span>
              {" · "}
              <span className="text-red-400 font-medium">{stats.lastRace.points} pts</span>
            </p>
          )}
        </div>
      ) : (
        <div className="card text-slate-500 text-sm">
          No race scores yet — make your first picks to see stats here.
        </div>
      )}

      {/* Edit form — updates avatar/name live on save */}
      <ProfileForm
        initialName={displayName}
        onSaved={(name) => setDisplayName(name)}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${accent ? "text-red-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
