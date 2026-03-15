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
          Qualifying, Sprint (where applicable), and the Race. The closer your predictions, the
          more points you earn. The player with the most points at the end of the season wins.
        </p>
      </Section>

      {/* When can you pick */}
      <Section title="When Can You Submit Picks?">
        <ul className="space-y-3 text-slate-300">
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              The picks window opens <strong className="text-white">48 hours before the first session</strong> of each race weekend (Sprint on sprint weekends, Qualifying otherwise).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 mt-0.5 shrink-0">▸</span>
            <span>
              Picks for each session lock at the <strong className="text-white">session start time</strong> — Qualifying locks at Qualifying start, Sprint locks at Sprint start, Race locks at Race start.
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
            name="Sprint"
            icon="⚡"
            description="Pick the top 10 finishers of the Sprint race. Only available at sprint weekends."
            picks="Top 10 drivers"
            accent="yellow"
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
        <p className="text-slate-400 text-sm mb-4">
          Points are awarded per pick based on how close your predicted position is to the actual finishing position.
        </p>

        <div className="space-y-4">
          {/* Qualifying */}
          <ScoringTable
            event="Qualifying"
            icon="🏁"
            basePoints={12}
            penaltyPerPlace={4}
            podiumBonus={6}
            rows={[
              { label: "Exact (off by 0)", points: 12 },
              { label: "Off by 1 place", points: 8 },
              { label: "Off by 2 places", points: 4 },
              { label: "Off by 3+ places", points: 0 }
            ]}
          />

          {/* Sprint */}
          <ScoringTable
            event="Sprint"
            icon="⚡"
            basePoints={6}
            penaltyPerPlace={1}
            podiumBonus={5}
            rows={[
              { label: "Exact (off by 0)", points: 6 },
              { label: "Off by 1 place", points: 5 },
              { label: "Off by 2 places", points: 4 },
              { label: "Off by 3 places", points: 3 },
              { label: "Off by 4 places", points: 2 },
              { label: "Off by 5 places", points: 1 },
              { label: "Off by 6+ places", points: 0 }
            ]}
          />

          {/* Race */}
          <ScoringTable
            event="Race"
            icon="🏆"
            basePoints={12}
            penaltyPerPlace={2}
            podiumBonus={10}
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
        </div>

        {/* Podium bonus */}
        <div className="mt-6 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-4 space-y-2">
          <p className="font-semibold text-yellow-300">🎯 Perfect Podium Bonus</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you predict <strong className="text-white">all three podium positions exactly right</strong> (P1, P2, P3 with the correct drivers in the correct order), you earn a bonus on top:
          </p>
          <ul className="text-sm text-slate-300 space-y-1 mt-2">
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Qualifying perfect podium</span>
              <span className="font-bold text-yellow-300">+6 pts</span>
            </li>
            <li className="flex justify-between border-b border-slate-800/60 py-1">
              <span>Sprint perfect podium</span>
              <span className="font-bold text-yellow-300">+5 pts</span>
            </li>
            <li className="flex justify-between py-1">
              <span>Race perfect podium</span>
              <span className="font-bold text-yellow-300">+10 pts</span>
            </li>
          </ul>
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
              Each race weekend total = your Qualifying + Sprint (if any) + Race points combined.
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
        <div className="rounded-lg overflow-hidden border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Session</th>
                <th className="px-4 py-2.5 text-right">Base (all exact)</th>
                <th className="px-4 py-2.5 text-right">+ Podium bonus</th>
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
                <td className="px-4 py-2.5">⚡ Sprint (10 picks)</td>
                <td className="px-4 py-2.5 text-right">60</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+5</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">65</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏆 Race (10 picks)</td>
                <td className="px-4 py-2.5 text-right">120</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+10</td>
                <td className="px-4 py-2.5 text-right font-bold text-white">130</td>
              </tr>
              <tr className="border-t-2 border-slate-700 bg-slate-800/40">
                <td className="px-4 py-2.5 font-semibold text-white">Sprint weekend total</td>
                <td className="px-4 py-2.5 text-right">216</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+21</td>
                <td className="px-4 py-2.5 text-right font-bold text-red-400">237</td>
              </tr>
              <tr className="border-t border-slate-700 bg-slate-800/40">
                <td className="px-4 py-2.5 font-semibold text-white">Normal weekend total</td>
                <td className="px-4 py-2.5 text-right">156</td>
                <td className="px-4 py-2.5 text-right text-yellow-400">+16</td>
                <td className="px-4 py-2.5 text-right font-bold text-red-400">172</td>
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
  accent: "violet" | "yellow" | "red";
}) {
  const colors = {
    violet: "border-violet-800/50 bg-violet-950/20",
    yellow: "border-yellow-800/50 bg-yellow-950/20",
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
  basePoints: number;
  penaltyPerPlace: number;
  podiumBonus: number;
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
