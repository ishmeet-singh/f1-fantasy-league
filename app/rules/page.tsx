import {
  BEST_WEEKENDS_COUNT,
  getEventConfig,
  pickScoreRows
} from "@/lib/scoring";
import {
  MAX_DROPPED_WEEKENDS,
  NO_DROP_UNTIL_WEEKENDS,
  SEASON_SCORING_RACES,
  countingWeekendsFor,
  dropsForScoredWeekends
} from "@/lib/season-standings";

const normalQuali = getEventConfig("quali", false);
const normalRace = getEventConfig("race", false);
const sprintQuali = getEventConfig("quali", true);
const sprintSession = getEventConfig("sprint", true);
const sprintRace = getEventConfig("race", true);

export default async function RulesPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">How to Play</h1>
        <p className="text-slate-400 mt-1 text-sm">Rules and scoring for F1 Friends League</p>
      </div>

      <Section title="Overview">
        <p className="text-slate-300 leading-relaxed">
          Before each race weekend, predict where drivers will finish in Qualifying, Sprint (on sprint
          weekends), and the Race. Points are awarded <strong className="text-white">per pick</strong> — the
          closer you are to the actual position, the more you earn.
        </p>
        <p className="text-slate-300 leading-relaxed mt-3">
          Season standings use your <strong className="text-white">best {BEST_WEEKENDS_COUNT} of {SEASON_SCORING_RACES} race weekends</strong>{" "}
          (Bahrain and Saudi Arabia 2026 were cancelled). Your <strong className="text-white">worst {MAX_DROPPED_WEEKENDS} weekends are dropped</strong>{" "}
          once you have more than {NO_DROP_UNTIL_WEEKENDS} scored races — e.g. after 8 races, only your best 4 count toward the total.
        </p>
      </Section>

      <Section title="Picks & deadlines">
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              <strong className="text-white">Qualifying</strong> — top 3 in order (P1, P2, P3).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              <strong className="text-white">Sprint</strong> — top 10 in order (sprint weekends only).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              <strong className="text-white">Race</strong> — top 10 in order.
            </span>
          </li>
        </ul>
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          <li>Picks open <strong className="text-slate-300">48 hours before the first session</strong> of the weekend.</li>
          <li>Each session locks at <strong className="text-slate-300">its scheduled start</strong> — you can edit until then.</li>
          <li>Reminder emails if you have not submitted for that session.</li>
        </ul>
      </Section>

      <Section title="How points work">
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-300 space-y-2">
          <p>
            For <strong className="text-white">each driver you pick</strong>:
          </p>
          <p className="font-mono text-center text-white py-1">
            points = max(0, max pts − places off × penalty)
          </p>
          <p>
            &quot;Places off&quot; is how far your predicted position is from where that driver actually finished.
            If a driver is not in the results, they are treated as P22 for scoring.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-4 text-sm space-y-3">
          <p className="font-semibold text-yellow-300">Perfect podium bonus</p>
          <p className="text-slate-300 leading-relaxed">
            If you get <strong className="text-white">P1, P2, and P3 exactly right</strong> (correct drivers in correct
            order) in a session, you earn a bonus on top of that session&apos;s pick points. Bonuses still add up to{" "}
            <strong className="text-white">+16 per weekend</strong> on both weekend types — on sprint weekends the pool
            is split across three sessions instead of two.
          </p>
          <PodiumBonusTable />
        </div>
      </Section>

      <Section title="Normal weekend scoring">
        <p className="text-slate-400 text-sm mb-4">
          Two sessions: Qualifying + Race. Weekend total = quali points + race points (including podium bonuses).
        </p>
        <div className="space-y-4">
          <SessionScoring
            name="Qualifying"
            icon="🏁"
            picks="3 picks"
            max={normalQuali.max}
            penalty={normalQuali.penalty}
            podiumBonus={normalQuali.podiumBonus}
          />
          <SessionScoring
            name="Race"
            icon="🏆"
            picks="10 picks"
            max={normalRace.max}
            penalty={normalRace.penalty}
            podiumBonus={normalRace.podiumBonus}
          />
        </div>
        <WeekendMaxTable
          rows={[
            { session: "Qualifying", base: 36, podium: 6, max: 42 },
            { session: "Race", base: 120, podium: 10, max: 130 }
          ]}
          total={{ base: 156, podium: 16, max: 172 }}
        />
      </Section>

      <Section title="Sprint weekend scoring">
        <p className="text-slate-400 text-sm mb-4">
          Three sessions: Qualifying + Sprint + Race. Qualifying per-pick scoring is <strong className="text-slate-300">unchanged</strong>{" "}
          from a normal weekend (12 pts max). Sprint and Race use lower per-pick caps so the extra session does not push
          the weekend above <strong className="text-slate-300">172 points</strong>. Each session can earn a podium bonus;
          Race gets the largest share (+8), matching the normal weekend&apos;s 2:1 race-to-quali podium ratio.
        </p>
        <div className="space-y-4">
          <SessionScoring
            name="Qualifying"
            icon="🏁"
            picks="3 picks"
            max={sprintQuali.max}
            penalty={sprintQuali.penalty}
            podiumBonus={sprintQuali.podiumBonus}
          />
          <SessionScoring
            name="Sprint"
            icon="⚡"
            picks="10 picks"
            max={sprintSession.max}
            penalty={sprintSession.penalty}
            podiumBonus={sprintSession.podiumBonus}
          />
          <SessionScoring
            name="Race"
            icon="🏆"
            picks="10 picks"
            max={sprintRace.max}
            penalty={sprintRace.penalty}
            podiumBonus={sprintRace.podiumBonus}
          />
        </div>
        <WeekendMaxTable
          rows={[
            { session: "Qualifying", base: 36, podium: 4, max: 40 },
            { session: "Sprint", base: 40, podium: 4, max: 44 },
            { session: "Race", base: 80, podium: 8, max: 88 }
          ]}
          total={{ base: 156, podium: 16, max: 172 }}
        />
      </Section>

      <Section title="Season standings">
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              For each player with <strong className="text-white">n</strong> scored race weekends: drop{" "}
              <strong className="text-white">min({MAX_DROPPED_WEEKENDS}, max(0, n − {NO_DROP_UNTIL_WEEKENDS}))</strong>{" "}
              of their lowest weekend totals (earliest race breaks ties), then sum the rest.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              <strong className="text-white">Example (8 races in):</strong> n = 8 → drop{" "}
              {dropsForScoredWeekends(8)} worst → your season score = sum of your best{" "}
              {countingWeekendsFor(8)} weekends.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>
              <strong className="text-white">Full season (22 races):</strong> drop {MAX_DROPPED_WEEKENDS} worst →
              sum of best {BEST_WEEKENDS_COUNT}.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">▸</span>
            <span>Leaderboard updates after each session&apos;s results are synced.</span>
          </li>
        </ul>
      </Section>
    </div>
  );
}

function PodiumBonusTable() {
  return (
    <div className="rounded-lg overflow-hidden border border-yellow-800/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-yellow-950/40 text-left text-xs text-slate-400 uppercase">
            <th className="px-3 py-2">Weekend type</th>
            <th className="px-3 py-2 text-right">Quali</th>
            <th className="px-3 py-2 text-right">Sprint</th>
            <th className="px-3 py-2 text-right">Race</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          <tr className="border-t border-yellow-900/40">
            <td className="px-3 py-2">Normal</td>
            <td className="px-3 py-2 text-right font-mono text-yellow-300">+6</td>
            <td className="px-3 py-2 text-right text-slate-600">—</td>
            <td className="px-3 py-2 text-right font-mono text-yellow-300">+10</td>
            <td className="px-3 py-2 text-right font-semibold text-white">+16</td>
          </tr>
          <tr className="border-t border-yellow-900/40 bg-yellow-950/20">
            <td className="px-3 py-2">Sprint</td>
            <td className="px-3 py-2 text-right font-mono text-yellow-300">+4</td>
            <td className="px-3 py-2 text-right font-mono text-yellow-300">+4</td>
            <td className="px-3 py-2 text-right font-mono text-yellow-300">+8</td>
            <td className="px-3 py-2 text-right font-semibold text-white">+16</td>
          </tr>
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-slate-500 border-t border-yellow-900/40">
        Race ÷ Quali = 1.67× on normal weekends (+10 ÷ +6) and sprint weekends (+8 ÷ +4).
      </p>
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

function SessionScoring({
  name,
  icon,
  picks,
  max,
  penalty,
  podiumBonus
}: {
  name: string;
  icon: string;
  picks: string;
  max: number;
  penalty: number;
  podiumBonus: number;
}) {
  const rows = pickScoreRows(max, penalty);
  return (
    <div>
      <p className="text-sm font-medium text-slate-300 mb-1">
        {icon} {name}{" "}
        <span className="text-slate-500 font-normal">
          ({picks} · {max} pts max per pick · −{penalty}/place · +{podiumBonus} podium)
        </span>
      </p>
      <div className="rounded-lg overflow-hidden border border-slate-800">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.label}
                className={`${i % 2 ? "bg-slate-800/20" : ""} border-t border-slate-800 first:border-0`}
              >
                <td className="px-4 py-2 text-slate-400">{r.label}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-white">
                  {r.points > 0 ? `${r.points} pts` : <span className="text-slate-600">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekendMaxTable({
  rows,
  total
}: {
  rows: { session: string; base: number; podium: number; max: number }[];
  total: { base: number; podium: number; max: number };
}) {
  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-slate-800 text-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase">
            <th className="px-4 py-2">If every pick is exact…</th>
            <th className="px-4 py-2 text-right">Pick pts</th>
            <th className="px-4 py-2 text-right">+ Podium</th>
            <th className="px-4 py-2 text-right">Session max</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {rows.map((r) => (
            <tr key={r.session} className="border-t border-slate-800">
              <td className="px-4 py-2">{r.session}</td>
              <td className="px-4 py-2 text-right">{r.base}</td>
              <td className="px-4 py-2 text-right text-yellow-400">+{r.podium}</td>
              <td className="px-4 py-2 text-right font-semibold text-white">{r.max}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-700 bg-slate-800/40">
            <td className="px-4 py-2 font-semibold text-white">Weekend total</td>
            <td className="px-4 py-2 text-right">{total.base}</td>
            <td className="px-4 py-2 text-right text-yellow-400">+{total.podium}</td>
            <td className="px-4 py-2 text-right font-bold text-red-400">{total.max}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
