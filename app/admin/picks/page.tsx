import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";

export const dynamic = "force-dynamic";

type EventType = "quali" | "sprint" | "race";
const EVENT_LABELS: Record<EventType, string> = { quali: "Qualifying", sprint: "Sprint", race: "Race" };

// Formatting happens client-side via the LocalTime component so timezone matches the browser

export default async function AdminPicksPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const [{ data: races }, { data: users }] = await Promise.all([
    supabase.from("race_weekends").select("id,grand_prix,race_start,has_sprint").order("race_start", { ascending: true }),
    supabase.from("users").select("id,email,display_name").order("created_at", { ascending: true })
  ]);

  if (!races?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Pick Monitor</h1>
        <div className="card text-slate-400">No races loaded. Sync the calendar first.</div>
      </div>
    );
  }

  const now = new Date().toISOString();

  // Find which races have any picks at all
  const { data: racesWithPicks } = await supabase
    .from("predictions")
    .select("race_id")
    .in("race_id", races.map((r) => r.id));
  const raceIdsWithPicks = new Set((racesWithPicks ?? []).map((p) => p.race_id));

  // Default: first race that has picks, then most recent past race, then first race
  const raceWithPicks = races.find((r) => raceIdsWithPicks.has(r.id));
  const pastRaces = races.filter((r) => r.race_start <= now);
  const defaultRace = raceWithPicks ?? (pastRaces.length > 0 ? pastRaces[pastRaces.length - 1] : races[0]);
  const selectedRaceId = searchParams.race || defaultRace.id;
  const selectedRace = races.find((r) => r.id === selectedRaceId) ?? defaultRace;

  // Fetch all predictions for this race (with driver names)
  // updated_at is optional — only exists after the migration is run
  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id,event_type,predicted_position,driver_id,created_at,drivers(name)")
    .eq("race_id", selectedRace.id)
    .order("predicted_position");

  // Build lookup: userId -> eventType -> picks[]
  type PickRow = {
    predicted_position: number;
    driver_id: string;
    driver_name: string;
    created_at: string | null;
  };
  type UserEventPicks = { picks: PickRow[]; first_at: string | null; last_at: string | null };

  const byUser = new Map<string, Record<EventType, UserEventPicks>>();

  for (const p of predictions ?? []) {
    if (!byUser.has(p.user_id)) {
      byUser.set(p.user_id, {
        quali: { picks: [], first_at: null, last_at: null },
        sprint: { picks: [], first_at: null, last_at: null },
        race: { picks: [], first_at: null, last_at: null }
      });
    }
    const et = p.event_type as EventType;
    const entry = byUser.get(p.user_id)![et];
    const driverName = Array.isArray(p.drivers)
      ? p.drivers[0]?.name
      : (p.drivers as { name: string } | null)?.name ?? p.driver_id;

    entry.picks.push({
      predicted_position: p.predicted_position,
      driver_id: p.driver_id,
      driver_name: driverName ?? p.driver_id,
      created_at: p.created_at
    });

    if (!entry.first_at || (p.created_at && p.created_at < entry.first_at)) entry.first_at = p.created_at;
    // Use created_at as last_at until updated_at migration is applied
    if (!entry.last_at || (p.created_at && p.created_at > entry.last_at)) entry.last_at = p.created_at;
  }

  const events: EventType[] = selectedRace.has_sprint ? ["quali", "sprint", "race"] : ["quali", "race"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← Admin</Link>
        <h1 className="text-2xl font-semibold">Pick Monitor</h1>
      </div>

      {/* Race selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {races.map((r, i) => {
          const selected = r.id === selectedRaceId;
          const hasPicks = raceIdsWithPicks.has(r.id);
          return (
            <Link
              key={r.id}
              href={`/admin/picks?race=${r.id}`}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                selected
                  ? "bg-red-600 border-red-500 text-white"
                  : hasPicks
                  ? "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              <span className="text-[10px] opacity-60">R{i + 1}</span>
              <span className="max-w-[72px] text-center leading-tight">
                {r.grand_prix.replace(" Grand Prix", "").replace("Grand Prix", "").trim()}
              </span>
              {hasPicks && !selected && <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />}
            </Link>
          );
        })}
      </div>

      {/* Race header */}
      <div>
        <h2 className="text-xl font-bold">{selectedRace.grand_prix}</h2>
        <p className="text-sm text-slate-500"><LocalTime iso={selectedRace.race_start} /></p>
      </div>

      {/* Per-event tables */}
      {events.map((et) => {
        const submittedCount = (users ?? []).filter((u) => byUser.get(u.id)?.[et]?.picks.length).length;
        const totalUsers = (users ?? []).length;

        return (
          <div key={et} className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">{EVENT_LABELS[et]}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                submittedCount === totalUsers
                  ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50"
                  : submittedCount > 0
                  ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}>
                {submittedCount}/{totalUsers} submitted
              </span>
            </div>

            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Picks</th>
                    <th className="px-4 py-3 hidden lg:table-cell">First submitted</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u, i) => {
                    const entry = byUser.get(u.id)?.[et];
                    const hasSubmitted = (entry?.picks.length ?? 0) > 0;
                    return (
                      <tr key={u.id} className={`border-t border-slate-800/50 ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{u.display_name || u.email.split("@")[0]}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {hasSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                              — Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasSubmitted ? (
                            <div className="space-y-0.5">
                              {entry!.picks
                                .sort((a, b) => a.predicted_position - b.predicted_position)
                                .map((p) => (
                                  <div key={p.predicted_position} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-slate-500 w-5">P{p.predicted_position}</span>
                                    <span className="text-slate-300">{p.driver_name}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs italic">No picks</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                          {entry?.first_at ? <LocalTime iso={entry.first_at} /> : "—"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {entry?.last_at && entry.last_at !== entry.first_at ? (
                            <div className="text-xs">
                              <div className="text-slate-300"><LocalTime iso={entry.last_at} /></div>
                              <div className="text-slate-600">by {u.display_name || u.email.split("@")[0]}</div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
