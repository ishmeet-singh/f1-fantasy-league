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
        <p className="text-slate-400 mt-1 text-sm">F1 Friends League</p>
      </div>

      <Section title="The basics">
        <p className="text-slate-300 leading-relaxed">
          Predict finishing positions before each session. Closer picks earn more points.
          Highest season total wins. Your season score uses your{" "}
          <strong className="text-white">best 20 weekends</strong>.
        </p>
      </Section>

      <Section title="Picks">
        <div className="rounded-lg border border-slate-800 overflow-hidden text-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase">
                <th className="px-4 py-2">Session</th>
                <th className="px-4 py-2">You pick</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏁 Qualifying</td>
                <td className="px-4 py-2.5">Top 3 in order</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">⚡ Sprint</td>
                <td className="px-4 py-2.5">Top 10 (sprint weekends only)</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">🏆 Race</td>
                <td className="px-4 py-2.5">Top 10 in order</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          <li>Window opens <strong className="text-slate-300">48h before the first session</strong> of the weekend.</li>
          <li>Each session <strong className="text-slate-300">locks at its start time</strong> — edit freely until then.</li>
          <li>Reminder emails if you have not submitted yet.</li>
        </ul>
      </Section>

      <Section title="Scoring">
        <p className="text-slate-300 text-sm leading-relaxed">
          Each pick starts at a <strong className="text-white">max value</strong>, minus a{" "}
          <strong className="text-white">penalty per place</strong> you are wrong (minimum 0).
          Get exact P1, P2, and P3 in a session for a <strong className="text-yellow-300">podium bonus</strong>.
        </p>

        <div className="rounded-lg border border-slate-800 overflow-hidden text-sm mt-4">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/60 text-left text-xs text-slate-400 uppercase">
                <th className="px-4 py-2">Session</th>
                <th className="px-4 py-2 text-right">Max</th>
                <th className="px-4 py-2 text-right">Per place off</th>
                <th className="px-4 py-2 text-right">Podium</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5 text-slate-500 text-xs" colSpan={4}>
                  Normal weekend
                </td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">Qualifying</td>
                <td className="px-4 py-2.5 text-right font-mono">12</td>
                <td className="px-4 py-2.5 text-right font-mono">−4</td>
                <td className="px-4 py-2.5 text-right text-yellow-400 font-mono">+6</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5">Race</td>
                <td className="px-4 py-2.5 text-right font-mono">12</td>
                <td className="px-4 py-2.5 text-right font-mono">−2</td>
                <td className="px-4 py-2.5 text-right text-yellow-400 font-mono">+10</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-2.5 text-slate-500 text-xs" colSpan={4}>
                  Sprint weekend <span className="normal-case text-slate-600">(same 172 pt cap)</span>
                </td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">Qualifying</td>
                <td className="px-4 py-2.5 text-right font-mono">7</td>
                <td className="px-4 py-2.5 text-right font-mono">−2</td>
                <td className="px-4 py-2.5 text-right text-yellow-400 font-mono">+6</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">Sprint</td>
                <td className="px-4 py-2.5 text-right font-mono">4</td>
                <td className="px-4 py-2.5 text-right font-mono">−1</td>
                <td className="px-4 py-2.5 text-right text-yellow-400 font-mono">+5</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-800/20">
                <td className="px-4 py-2.5">Race</td>
                <td className="px-4 py-2.5 text-right font-mono">10</td>
                <td className="px-4 py-2.5 text-right font-mono">−2</td>
                <td className="px-4 py-2.5 text-right text-yellow-400 font-mono">+10</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-slate-500 mt-3">
          Example: exact quali pick = 12 pts; off by 1 = 8 pts. Race rewards accuracy on all 10 picks;
          sprint weekends use lower caps so the extra session does not inflate the weekend total.
        </p>

        <p className="text-sm text-slate-400 mt-4">
          <strong className="text-white">Perfect weekend max: 172 points</strong> — normal or sprint weekend.
        </p>
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
