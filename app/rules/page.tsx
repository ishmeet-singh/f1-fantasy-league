import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function RulesPage() {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">How to Play</h1>
        <p className="text-slate-400 mt-1 text-sm">Rules and scoring for F1 Friends League</p>
      </div>

      {/* Overview */}
      <Section title="Overview">
        <p className="text-slate-300 leading-relaxed">
          Before each race weekend, predict which drivers will finish in the top positions across
          Qualifying, Sprint Qualifying &amp; Sprint (where applicable), and the Race. The closer
          your predictions, the more points you earn. The player with the most points at the end
          of the season wins.
        </p>
      </Section>

      {/* When can you pick */}
      <Section title="When Can You Submit Picks?">
        <ul className="space-y-3 text-slate-300">
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              The picks window opens <strong className="text-white">48 hours before the first session</strong> of each race weekend (Sprint Qualifying on sprint weekends, Qualifying otherwise).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              Picks for each session lock at the <strong className="text-white">session start time</strong> — Qualifying locks at Qualifying start, Sprint Qualifying at Sprint Qualifying start, Sprint at Sprint start, Race at Race start.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              You can update your picks any time before the lock. Once locked, no changes are allowed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              Reminder emails go out at <strong className="text-white">48h, 24h, 12h, 6h, 3h, 1h and 5 mins</strong> before each session if you haven&apos;t submitted yet.
            </span>
          </li>
        </ul>
      </Section>

      {/* What you predict */}
      <Section title="What You Predict">
        <div className="space-y-4">
          <EventCard
            name="Qualifying"
            icon="🏁"
            description="Pick the top 3 finishers in qualifying order."
            picks="Top 3 drivers"
            accent="violet"
          />
          <EventCard
            name="Sprint Qualifying"
            icon="⚡"
            description="Pick the top 3 finishers in sprint qualifying order. Only available at sprint weekends."
            picks="Top 3 drivers"
            accent="yellow"
          />
          <EventCard
            name="Sprint"
            icon="🏃"
            description="Pick the top 10 finishers of the Sprint race. Only available at sprint weekends."
            picks="Top 10 drivers"
            accent="orange"
          />
          <EventCard
            name="Race"
            icon="🏆"
            description="Pick the top 10 finishers of the Grand Prix."
            picks="Top 10 drivers"
            accent="red"
          />
        </div>
      </Section>

      {/* Scoring */}
      <Section title="Scoring System">
        <p className="text-slate-400 text-sm mb-2">
          Points are awarded per pick based on how close your predicted position is to the actual finishing position.
          On sprint weekends, all session point values are <strong className="text-white">scaled down</strong> so the
          maximum weekend total stays the same as a normal weekend — no unfair advantage for sprint rounds.
        </p>

        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 mb-4 text-sm text-slate-300 space-y-1">
          <p className="font-semibold text-white text-xs uppercase tracking-wider mb-1">Normal weekend</p>
          <div className="grid grid-cols-2 gap-x-6 text-xs">
            <span className="text-slate-400">Qualifying (3 picks)</span><span>max 12 pts, −4/place</span>
            <span className="text-slate-400">Race (10 picks)</span><span>max 12 pts, −2/place</span>
          </div>
          <p className="font-semibold text-white text-xs uppercase tracking-wider mt-2 mb-1">Sprint weekend (normalised)</p>
          <div className="grid grid-cols-2 gap-x-6 text-xs">
            <span className="text-slate-400">Qualifying (3 picks)</span><span>max 8 pts, −2/place</span>
            <span className="text-slate-400">Sprint Qualifying (3 picks)</span><span>max 4 pts, −1/place</span>
            <span className="text-slate-400">Sprint (10 picks)</span><span>max 4 pts, −1/place</span>
            <span className="text-slate-400">Race (10 picks)</span><span>max 8 pts, −1/place</span>
          </div>
        </div>

        <div className="space-y-4">
          <ScoringTable
            event="Qualifying (normal weekend)"
            icon="🏁"
            rows={[
              { label: "Exact (off by 0)", points: 12 },
              { label: "Off by 1 place", points: 8 },
              { label: "Off by 2 places", points: 4 },
              { label: "Off by 3+ places", points: 0 }
            ]}
          />

          <ScoringTable
            event="Qualifying (sprint weekend)"
            icon="🏁"
            rows={[
              { label: "Exact (off by 0)", points: 8 },
              { label: "Off by 1 place", points: 6 },
              { label: "Off by 2 places", points: 4 },
              { label: "Off by 3 places", points: 2 },
              { label: "Off by 4+ places", points: 0 }
            ]}
          />

          <ScoringTable
            event="Sprint Qualifying"
            icon="⚡"
            rows={[
              { label: "Exact (off by 0)", points: 4 },
              { label: "Off by 1 place", points: 3 },
              { label: "Off by 2 places", points: 2 },
              { label: "Off by 3 places", points: 1 },
              { label: "Off by 4+ places", points: 0 }
            ]}
          />

          <ScoringTable
            event="Sprint"
            icon="🏃"
            rows={[
              { label: "Exact (off by 0)", points: 4 },
              { label: "Off by 1 place", points: 3 },
              { label: "Off by 2 places", points: 2 },
              { label: "Off by 3 places", points: 1 },
              { label: "Off by 4+ places", points: 0 }
            ]}
          />

          <ScoringTable
            event="Race (normal weekend)"
            icon="🏆"
            rows={[
              { label: "Exact (off by 0)", points: 12 },
              { label: "Off by 1 place", points: 10 },
              { label: "Off by 2 places", points: 8 },
              { label: "Off by 3 places", points: 6 },
              { label: "Off by 4 places", points: 4 },
              { label: "Off by 5 places", points: 2 },
              { label: "Off by 6+ places", points: 0 }
            ]}
          />

          <ScoringTable
            event="Race (sprint weekend)"
            icon="🏆"
            rows={[
              { label: "Exact (off by 0)", points: 8 },
              { label: "Off by 1 place", points: 7 },
              { label: "Off by 2 places", points: 6 },
              { label: "Off by 3 places", points: 5 },
              { label: "Off by 4 places", points: 4 },
              { label: "Off by 5 places", points: 3 },
              { label: "Off by 6+ places", points: 0 }
            ]}
          />
        </div>

        {/* DNF penalty */}
        <div className="mt-6 rounded-lg border border-red-700/50 bg-red-950/20 p-4 space-y-2">
          <p className="font-semibold text-red-400">💥 DNF Penalty</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            If a driver you picked <strong className="text-white">does not finish</strong> (DNF, DNS, or not classified),
            you receive <strong className="text-red-400">−5 points</strong> on top of any other score for that pick.
            This applies to all four sessions. Your total for that pick can go negative.
          </p>
        </div>

        {/* Podium bonus */}
        <div className="mt-4 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-4 space-y-2">
          <p className="font-semibold text-yellow-300">🎯 Perfect Podium Bonus</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you predict <strong className="text-white">all three podium positions exactly right</strong> (P1, P2, P3 with the correct drivers in the correct order), you earn a bonus on top:
          </p>
          <ul className="text-sm text-slate-300 space-y-1 mt-2">
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Qualifying perfect podium (normal weekend)</span>
              <span className="font-bold text-yellow-300">+6 pts</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Qualifying perfect podium (sprint weekend)</span>
              <span className="font-bold text-yellow-300">+4 pts</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Sprint Qualifying perfect podium</span>
              <span className="font-bold text-yellow-300">+2 pts</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Sprint perfect podium</span>
              <span className="font-bold text-yellow-300">+2 pts</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Race perfect podium (normal weekend)</span>
              <span className="font-bold text-yellow-300">+10 pts</span>
            </li>
            <li className="flex justify-between py-1">
              <span>Race perfect podium (sprint weekend)</span>
              <span className="font-bold text-yellow-300">+6 pts</span>
            </li>
          </ul>
        </div>

        {/* Megabonus */}
        <div className="mt-4 rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-4 space-y-2">
          <p className="font-semibold text-emerald-400">🌟 Megabonus — Perfect Weekend</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Nail the perfect podium in <strong className="text-white">every session</strong> of the race weekend and earn an extra <strong className="text-emerald-400">+50 points</strong>.
          </p>
          <ul className="text-sm text-slate-400 space-y-1 mt-1">
            <li>Normal weekend: perfect podium in Qualifying <em>and</em> Race → +50</li>
            <li>Sprint weekend: perfect podium in all four sessions → +50</li>
          </ul>
          <p className="text-xs text-slate-500 mt-1">Incredibly rare — but worth it.</p>
        </div>
      </Section>

      {/* Season standings */}
      <Section title="Season Standings">
        <ul className="space-y-3 text-slate-300">
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              Your season score is the sum of your <strong className="text-white">best 20 race weekends</strong>. This means you can miss a few weekends without being penalised.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              Each race weekend total = your Qualifying + Sprint Qualifying + Sprint (if any) + Race points combined.
              Sprint weekends are normalised — they cap at the same maximum as normal weekends.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              The leaderboard updates automatically after each session result is confirmed.
            </span>
          </li>
        </ul>
      </Section>

      {/* Max points reference */}
      <Section title="Maximum Points Per Weekend">
        <div className="rounded-lg overflow-hidden border border-slate-800 mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Normal weekend</th>
                <th className="px-4 py-2.5 text-right">Base (all exact)</th>
                <th className="px-4 py-2.5 text-right">+ Podium</th>
                <th className="px-4 py-2.5 text-right font-bold text-white">Max</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏁 Qualifying (3 picks)</td>
                <td className="px-4 py-2.5 text-right">36</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+6</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">42</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">🏆 Race (10 picks)</td>
                <td className="px-4 py-2.5 text-right">120</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+10</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">130</td>
              </tr>
              <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                <td className="px-4 py-2.5 font-semibold text-white">Normal weekend total</td>
                <td className="px-4 py-2.5 text-right">156</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+16</td>
                <td className="px-4 py-2.5 text-right font-bold text-red-400">172</td>
              </tr>
              <tr className="border-t border-emerald-800/50 bg-emerald-950/10">
                <td className="px-4 py-2.5 text-emerald-400">+ Megabonus (both sessions perfect)</td>
                <td className="px-4 py-2.5 text-right"></td>
                <td className="px-4 py-2.5 text-right text-emerald-400">+50</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-400">222</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg overflow-hidden border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Sprint weekend (normalised)</th>
                <th className="px-4 py-2.5 text-right">Base (all exact)</th>
                <th className="px-4 py-2.5 text-right">+ Podium</th>
                <th className="px-4 py-2.5 text-right font-bold text-white">Max</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏁 Qualifying (3 picks)</td>
                <td className="px-4 py-2.5 text-right">24</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+4</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">28</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">⚡ Sprint Qualifying (3 picks)</td>
                <td className="px-4 py-2.5 text-right">12</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+2</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">14</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏃 Sprint (10 picks)</td>
                <td className="px-4 py-2.5 text-right">40</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+2</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">42</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">🏆 Race (10 picks)</td>
                <td className="px-4 py-2.5 text-right">80</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+6</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">86</td>
              </tr>
              <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                <td className="px-4 py-2.5 font-semibold text-white">Sprint weekend total</td>
                <td className="px-4 py-2.5 text-right">156</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+14</td>
                <td className="px-4 py-2.5 text-right font-bold text-red-400">170</td>
              </tr>
              <tr className="border-t border-emerald-800/50 bg-emerald-950/10">
                <td className="px-4 py-2.5 text-emerald-400">+ Megabonus (all 4 sessions perfect)</td>
                <td className="px-4 py-2.5 text-right"></td>
                <td className="px-4 py-2.5 text-right text-emerald-400">+50</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-400">220</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function EventCard({
  name,
  icon,
  description,
  picks,
  accent
}: {
  name: string;
  icon: string;
  description: string;
  picks: string;
  accent: "violet" | "yellow" | "orange" | "red";
}) {
  const colors = {
    violet: "border-violet-800/50 bg-violet-950/20",
    yellow: "border-yellow-800/50 bg-yellow-950/20",
    orange: "border-orange-800/50 bg-orange-950/20",
    red: "border-red-800/50 bg-red-950/20"
  };
  return (
    <div className={`rounded-lg border p-4 flex gap-4 items-start ${colors[accent]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-white">{name}</p>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        <p className="text-xs text-slate-500 mt-1">Picks: {picks}</p>
      </div>
    </div>
  );
}

function ScoringTable({
  event,
  icon,
  rows
}: {
  event: string;
  icon: string;
  rows: { label: string; points: number }[];
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-300 mb-2">{icon} {event}</p>
      <div className="rounded-lg overflow-hidden border border-slate-800">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={`${i % 2 === 0 ? "" : "bg-slate-800/20"} border-t border-slate-800 first:border-0`}>
                <td className="px-4 py-2 text-slate-400">{r.label}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-white">
                  {r.points > 0 ? `${r.points} pts` : <span className="text-slate-600">0 pts</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
