import type { ReactNode } from "react";
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
import { F1 } from "@/lib/f1-theme";

const normalQuali = getEventConfig("quali", false);
const normalRace = getEventConfig("race", false);
const sprintQuali = getEventConfig("quali", true);
const sprintSession = getEventConfig("sprint", true);
const sprintRace = getEventConfig("race", true);

export default async function RulesPage() {
  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
          F1 Fantasy League
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">How to play</h1>
        <p className="mt-2 text-sm text-white/60">Rules and scoring</p>
      </div>

      <Section title="Overview">
        <p className="text-sm leading-relaxed" style={{ color: F1.carbon }}>
          Before each race weekend, predict where drivers will finish in Qualifying, Sprint (on sprint
          weekends), and the Race. Points are awarded <strong>per pick</strong> — the closer you are to
          the actual position, the more you earn.
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: F1.carbon }}>
          Season standings use your <strong>best {BEST_WEEKENDS_COUNT} of {SEASON_SCORING_RACES} race weekends</strong>{" "}
          (Bahrain and Saudi Arabia 2026 were cancelled). Your <strong>worst {MAX_DROPPED_WEEKENDS} weekends are dropped</strong>{" "}
          once you have more than {NO_DROP_UNTIL_WEEKENDS} scored races.
        </p>
      </Section>

      <DropRuleCallout />

      <Section title="Picks & deadlines">
        <BulletList
          items={[
            <><strong>Qualifying</strong> — top 3 in order (P1, P2, P3).</>,
            <><strong>Sprint</strong> — top 10 in order (sprint weekends only).</>,
            <><strong>Race</strong> — top 10 in order.</>
          ]}
        />
        <ul className="mt-4 space-y-2 text-sm" style={{ color: F1.carbonLight }}>
          <li>
            Picks open <strong style={{ color: F1.carbon }}>48 hours before the first session</strong> of the weekend.
          </li>
          <li>
            Each session locks at <strong style={{ color: F1.carbon }}>its scheduled start</strong> — you can edit until then.
          </li>
          <li>Reminder emails if you have not submitted for that session.</li>
        </ul>
      </Section>

      <Section title="How points work">
        <div
          className="space-y-2 rounded-xl p-4 text-sm"
          style={{ background: F1.offWhite, border: `1px solid ${F1.gridLine}`, color: F1.carbon }}
        >
          <p>
            For <strong>each driver you pick</strong>:
          </p>
          <p className="py-1 text-center font-mono font-semibold" style={{ color: F1.carbon }}>
            points = max(0, max pts − places off × penalty)
          </p>
          <p style={{ color: F1.carbonLight }}>
            &quot;Places off&quot; is how far your predicted position is from where that driver actually finished.
            If a driver is not in the results, they are treated as P22 for scoring.
          </p>
        </div>

        <div
          className="mt-4 space-y-3 rounded-xl p-4 text-sm"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <p className="font-bold" style={{ color: "#92400E" }}>
            Perfect podium bonus
          </p>
          <p className="leading-relaxed" style={{ color: F1.carbon }}>
            If you get <strong>P1, P2, and P3 exactly right</strong> (correct drivers in correct order) in a
            session, you earn a bonus on top of that session&apos;s pick points. Bonuses still add up to{" "}
            <strong>+16 per weekend</strong> on both weekend types — on sprint weekends the pool is split across
            three sessions instead of two.
          </p>
          <PodiumBonusTable />
        </div>
      </Section>

      <Section title="Normal weekend scoring">
        <p className="mb-4 text-sm" style={{ color: F1.carbonLight }}>
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
        <p className="mb-4 text-sm" style={{ color: F1.carbonLight }}>
          Three sessions: Qualifying + Sprint + Race. Qualifying per-pick scoring is <strong style={{ color: F1.carbon }}>unchanged</strong>{" "}
          from a normal weekend (12 pts max). Sprint and Race use lower per-pick caps so the extra session does not push
          the weekend above <strong style={{ color: F1.carbon }}>172 points</strong>. Each session can earn a podium bonus;
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
        <BulletList
          items={[
            <>
              For each player with <strong>n</strong> scored race weekends: drop{" "}
              <strong>min({MAX_DROPPED_WEEKENDS}, max(0, n − {NO_DROP_UNTIL_WEEKENDS}))</strong> of their lowest
              weekend totals (earliest race breaks ties), then sum the rest.
            </>,
            <>
              <strong>Example (8 races in):</strong> n = 8 → drop {dropsForScoredWeekends(8)} worst → your season score
              = sum of your best {countingWeekendsFor(8)} weekends.
            </>,
            <>
              <strong>Full season ({SEASON_SCORING_RACES} races):</strong> drop {MAX_DROPPED_WEEKENDS} worst → sum of
              best {BEST_WEEKENDS_COUNT}.
            </>,
            <>Leaderboard updates after each session&apos;s results are synced.</>
          ]}
        />
      </Section>
    </>
  );
}

function DropRuleCallout() {
  return (
    <section
      className="rounded-2xl p-4"
      style={{ background: F1.redLight, border: `1px solid ${F1.red}33`, boxShadow: F1.cardShadow }}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
        Best 4 of 8 drop rule
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: F1.carbon }}>
        Once you have <strong>8 scored race weekends</strong>, only your <strong>best 4 weekend totals</strong> count
        toward your season score — your <strong>worst 4 are dropped</strong>. Before that, drops scale up gradually
        (no drops until you pass {NO_DROP_UNTIL_WEEKENDS} weekends). At full season, it becomes best{" "}
        <strong>{BEST_WEEKENDS_COUNT} of {SEASON_SCORING_RACES}</strong> (drop {MAX_DROPPED_WEEKENDS} worst).
      </p>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        {[
          { label: "4 weekends", value: "All 4 count · 0 dropped" },
          { label: "8 weekends", value: "Best 4 count · 4 dropped" },
          { label: `${SEASON_SCORING_RACES} weekends`, value: `Best ${BEST_WEEKENDS_COUNT} · ${MAX_DROPPED_WEEKENDS} dropped` }
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-xl px-3 py-2"
            style={{ background: F1.white, border: `1px solid ${F1.gridLine}` }}
          >
            <p className="font-bold" style={{ color: F1.carbonMid }}>
              {row.label}
            </p>
            <p className="mt-0.5 font-medium" style={{ color: F1.carbon }}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 text-sm" style={{ color: F1.carbon }}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 font-bold" style={{ color: F1.red }}>
            ▸
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PodiumBonusTable() {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#FDE68A" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ background: "#FEF3C7", color: F1.carbonMid }}>
            <th className="px-3 py-2">Weekend type</th>
            <th className="px-3 py-2 text-right">Quali</th>
            <th className="px-3 py-2 text-right">Sprint</th>
            <th className="px-3 py-2 text-right">Race</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody style={{ color: F1.carbon }}>
          <tr className="border-t" style={{ borderColor: "#FDE68A" }}>
            <td className="px-3 py-2">Normal</td>
            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#92400E" }}>
              +6
            </td>
            <td className="px-3 py-2 text-right" style={{ color: F1.carbonLight }}>
              —
            </td>
            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#92400E" }}>
              +10
            </td>
            <td className="px-3 py-2 text-right font-bold">+16</td>
          </tr>
          <tr className="border-t" style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}>
            <td className="px-3 py-2">Sprint</td>
            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#92400E" }}>
              +4
            </td>
            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#92400E" }}>
              +4
            </td>
            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#92400E" }}>
              +8
            </td>
            <td className="px-3 py-2 text-right font-bold">+16</td>
          </tr>
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs" style={{ borderColor: "#FDE68A", color: F1.carbonLight }}>
        Race ÷ Quali = 1.67× on normal weekends (+10 ÷ +6) and sprint weekends (+8 ÷ +4).
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <h2
        className="border-b pb-2 text-base font-bold"
        style={{ color: F1.carbon, borderColor: F1.gridLine }}
      >
        {title}
      </h2>
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
      <p className="mb-1 text-sm font-semibold" style={{ color: F1.carbon }}>
        {icon} {name}{" "}
        <span className="font-normal" style={{ color: F1.carbonLight }}>
          ({picks} · {max} pts max per pick · −{penalty}/place · +{podiumBonus} podium)
        </span>
      </p>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: F1.gridLine }}>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.label}
                style={{
                  borderTop: i > 0 ? `1px solid ${F1.gridLine}` : undefined,
                  background: i % 2 ? F1.offWhite : F1.white
                }}
              >
                <td className="px-4 py-2" style={{ color: F1.carbonLight }}>
                  {r.label}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold" style={{ color: F1.carbon }}>
                  {r.points > 0 ? `${r.points} pts` : <span style={{ color: F1.carbonLight }}>0</span>}
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
    <div className="mt-4 overflow-hidden rounded-xl border text-sm" style={{ borderColor: F1.gridLine }}>
      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ background: F1.offWhite, color: F1.carbonMid }}>
            <th className="px-4 py-2">If every pick is exact…</th>
            <th className="px-4 py-2 text-right">Pick pts</th>
            <th className="px-4 py-2 text-right">+ Podium</th>
            <th className="px-4 py-2 text-right">Session max</th>
          </tr>
        </thead>
        <tbody style={{ color: F1.carbon }}>
          {rows.map((r, i) => (
            <tr key={r.session} style={{ borderTop: `1px solid ${F1.gridLine}`, background: i % 2 ? F1.offWhite : F1.white }}>
              <td className="px-4 py-2">{r.session}</td>
              <td className="px-4 py-2 text-right">{r.base}</td>
              <td className="px-4 py-2 text-right font-semibold" style={{ color: "#92400E" }}>
                +{r.podium}
              </td>
              <td className="px-4 py-2 text-right font-semibold">{r.max}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${F1.gridLine}`, background: F1.offWhite }}>
            <td className="px-4 py-2 font-bold">Weekend total</td>
            <td className="px-4 py-2 text-right">{total.base}</td>
            <td className="px-4 py-2 text-right font-semibold" style={{ color: "#92400E" }}>
              +{total.podium}
            </td>
            <td className="px-4 py-2 text-right font-bold" style={{ color: F1.red }}>
              {total.max}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
