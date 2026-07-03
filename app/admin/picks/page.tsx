import { Suspense } from "react";
import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { AdminPicksRaceSelector } from "@/components/admin-picks-race-selector";
import { RacePageSkeleton } from "@/components/race-page-skeleton";
import { F1 } from "@/lib/f1-theme";

export const dynamic = "force-dynamic";

type EventType = "quali" | "sprint" | "race";
const EVENT_LABELS: Record<EventType, string> = { quali: "Qualifying", sprint: "Sprint", race: "Race" };

export default function AdminPicksPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const raceKey = searchParams.race ?? "";
  return (
    <Suspense key={raceKey} fallback={<RacePageSkeleton variant="results" />}>
      <AdminPicksContent raceId={searchParams.race} />
    </Suspense>
  );
}

async function AdminPicksContent({ raceId }: { raceId?: string }) {
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const [{ data: races }, { data: users }] = await Promise.all([
    supabase
      .from("race_weekends")
      .select("id,grand_prix,race_start,has_sprint")
      .order("race_start", { ascending: true }),
    supabase.from("users").select("id,email,display_name").order("created_at", { ascending: true })
  ]);

  if (!races?.length) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center" style={{ boxShadow: F1.cardShadow }}>
        <p className="font-semibold" style={{ color: F1.carbon }}>
          No races loaded
        </p>
        <p className="mt-2 text-sm" style={{ color: F1.carbonLight }}>
          Sync the calendar from Admin first.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold" style={{ color: F1.red }}>
          ← Back to Admin
        </Link>
      </section>
    );
  }

  const now = new Date().toISOString();

  const { data: racesWithPicks } = await supabase
    .from("predictions")
    .select("race_id")
    .in(
      "race_id",
      races.map((r) => r.id)
    );
  const raceIdsWithPicks = new Set((racesWithPicks ?? []).map((p) => p.race_id));

  const raceWithPicks = races.find((r) => raceIdsWithPicks.has(r.id));
  const pastRaces = races.filter((r) => r.race_start <= now);
  const defaultRace = raceWithPicks ?? (pastRaces.length > 0 ? pastRaces[pastRaces.length - 1] : races[0]);
  const selectedRaceId = raceId || defaultRace.id;
  const selectedRace = races.find((r) => r.id === selectedRaceId) ?? defaultRace;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id,event_type,predicted_position,driver_id,created_at,drivers(name)")
    .eq("race_id", selectedRace.id)
    .order("predicted_position");

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
      : ((p.drivers as { name: string } | null)?.name ?? p.driver_id);

    entry.picks.push({
      predicted_position: p.predicted_position,
      driver_id: p.driver_id,
      driver_name: driverName ?? p.driver_id,
      created_at: p.created_at
    });

    if (!entry.first_at || (p.created_at && p.created_at < entry.first_at)) entry.first_at = p.created_at;
    if (!entry.last_at || (p.created_at && p.created_at > entry.last_at)) entry.last_at = p.created_at;
  }

  const events: EventType[] = selectedRace.has_sprint ? ["quali", "sprint", "race"] : ["quali", "race"];
  const totalUsers = (users ?? []).length;
  const totalSubmitted = events.reduce((sum, et) => {
    const count = (users ?? []).filter((u) => byUser.get(u.id)?.[et]?.picks.length).length;
    return sum + count;
  }, 0);
  const totalSlots = totalUsers * events.length;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
              {selectedRace.grand_prix}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Pick Monitor</h1>
            <p className="mt-1 text-sm text-white/60">
              <LocalTime iso={selectedRace.race_start} />
            </p>
          </div>
          <Link
            href="/admin"
            className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-90"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: F1.white }}
          >
            ← Admin
          </Link>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-white/60">Submissions</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight" style={{ color: F1.red }}>
              {totalSubmitted}
              <span className="text-lg font-semibold text-white/50">/{totalSlots}</span>
            </p>
          </div>
          {selectedRace.has_sprint && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(211,20,17,0.2)", color: F1.red }}
            >
              Sprint weekend
            </span>
          )}
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
          Race weekend
        </p>
        <AdminPicksRaceSelector
          races={races.map((r, i) => ({
            id: r.id,
            grand_prix: r.grand_prix,
            round: i + 1,
            hasPicks: raceIdsWithPicks.has(r.id)
          }))}
          selectedRaceId={selectedRaceId}
        />
      </section>

      {events.map((et) => {
        const submittedCount = (users ?? []).filter((u) => byUser.get(u.id)?.[et]?.picks.length).length;
        const allIn = submittedCount === totalUsers && totalUsers > 0;
        const someIn = submittedCount > 0;

        return (
          <section key={et} className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: F1.carbon }}>
                {EVENT_LABELS[et]}
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={
                  allIn
                    ? { background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }
                    : someIn
                      ? { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }
                      : { background: F1.offWhite, color: F1.carbonLight, border: `1px solid ${F1.gridLine}` }
                }
              >
                {submittedCount}/{totalUsers} submitted
              </span>
            </div>

            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr
                    className="text-left text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: F1.carbonLight, borderBottom: `1px solid ${F1.gridLine}` }}
                  >
                    <th className="px-4 py-2.5">Player</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Picks</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">First submitted</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u, i) => {
                    const entry = byUser.get(u.id)?.[et];
                    const hasSubmitted = (entry?.picks.length ?? 0) > 0;
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderTop: `1px solid ${F1.gridLine}`,
                          background: i % 2 === 1 ? F1.offWhite : F1.white
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: F1.carbon }}>
                            {u.display_name || u.email.split("@")[0]}
                          </div>
                          <div className="text-xs" style={{ color: F1.carbonLight }}>
                            {u.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasSubmitted ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                              style={{ background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }}
                            >
                              ✓ Submitted
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                              style={{
                                background: F1.offWhite,
                                color: F1.carbonLight,
                                border: `1px solid ${F1.gridLine}`
                              }}
                            >
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasSubmitted ? (
                            <div className="space-y-1">
                              {entry!.picks
                                .sort((a, b) => a.predicted_position - b.predicted_position)
                                .map((p) => (
                                  <div key={p.predicted_position} className="flex items-center gap-2 text-xs">
                                    <span
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                                      style={{ background: F1.carbon, color: F1.white }}
                                    >
                                      P{p.predicted_position}
                                    </span>
                                    <span style={{ color: F1.carbon }}>{p.driver_name}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <span className="text-xs italic" style={{ color: F1.carbonLight }}>
                              No picks
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-xs lg:table-cell" style={{ color: F1.carbonLight }}>
                          {entry?.first_at ? <LocalTime iso={entry.first_at} /> : "—"}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {entry?.last_at && entry.last_at !== entry.first_at ? (
                            <div className="text-xs">
                              <div style={{ color: F1.carbon }}><LocalTime iso={entry.last_at} /></div>
                              <div style={{ color: F1.carbonLight }}>
                                by {u.display_name || u.email.split("@")[0]}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: F1.carbonLight }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
