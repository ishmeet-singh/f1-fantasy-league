/**
 * PRODUCT BACKLOG — /design/backlog
 *
 * Running backlog of technical debt, features, and architectural improvements.
 * Each item has full context: why it's needed, what broke/prompted it, and what
 * needs to be done to resolve it.
 *
 * Items are prioritised: P1 (critical), P2 (important), P3 (nice to have).
 */

export default function BacklogPage() {
  return (
    <div className="max-w-3xl space-y-10 py-4">

      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-2xl font-bold text-white">Product Backlog</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Prioritised technical debt + feature backlog with full context. Updated as items are added or completed.
        </p>
        <div className="flex gap-3 mt-4 text-xs">
          <span className="bg-red-900/40 border border-red-800/50 text-red-300 px-2 py-1 rounded">P1 Critical</span>
          <span className="bg-yellow-900/40 border border-yellow-800/50 text-yellow-300 px-2 py-1 rounded">P2 Important</span>
          <span className="bg-slate-800 border border-slate-700 text-slate-400 px-2 py-1 rounded">P3 Nice to have</span>
          <span className="bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 px-2 py-1 rounded">✓ Done</span>
        </div>
      </div>

      {/* ── TECHNICAL DEBT ── */}
      <Section title="Technical Debt">

        <BacklogItem
          id="TD-01"
          priority="P1"
          title="Unified driver + race cross-reference tables"
          status="backlog"
          addedBecause="Driver names showing as raw IDs (e.g. '3' instead of 'Max Verstappen') in results and picks. Root cause: two APIs use completely different identifier systems — OpenF1 uses driver_number (3, 16, 63), Jolpi uses driverId ('max_verstappen', 'leclerc'). The drivers table uses OpenF1 numbers as PK, so results from Jolpi can't be reliably joined. Fuzzy name-matching was used as workaround but breaks when names are empty."
          whatToDo={[
            "Create driver_crossref table: openf1_id | jolpi_id | canonical_name | team",
            "Create race_crossref table: openf1_id | jolpi_round | year | grand_prix",
            "Populate both tables during calendar sync from both APIs simultaneously",
            "Update all queries (predictions, results, scores) to join through crossref",
            "Update sync code to write both IDs when available",
            "Replace the current 'fix-driver-names' admin hack with proper crossref lookups",
            "Add Supabase migration SQL for new tables"
          ]}
          impact="Eliminates entire class of 'wrong name' bugs permanently. No more fuzzy matching or empty name overwrites across API sources."
        />

        <BacklogItem
          id="TD-02"
          priority="P2"
          title="OpenF1 driver sync uses session_key=latest — unreliable"
          status="backlog"
          addedBecause="syncCalendarOpenF1 fetches /v1/drivers?session_key=latest. OpenF1 returns driver data per-session — if a driver's full_name is empty in the 'latest' session (e.g. during off-season, test sessions, or partial data), the upsert overwrites their stored good name with empty string. Caused Verstappen's name to show as '3'."
          whatToDo={[
            "Change fetchDrivers() to fetch from all race sessions for the year instead of 'latest'",
            "Merge driver data across sessions — use first non-empty full_name found",
            "Better handled by TD-01 (crossref table) but worth fixing independently too"
          ]}
          impact="Prevents driver name corruption on each sync cycle."
        />

        <BacklogItem
          id="TD-03"
          priority="P2"
          title="Results sync misses sessions during race weekend (quali before race_start)"
          status="backlog"
          addedBecause="syncResultsOpenF1 filtered races by race_start <= now, meaning qualifying/sprint results wouldn't sync until the main race day passed. For Chinese GP: Sprint is March 14 03:00, Qualifying is March 14 07:00, Race is March 15 — we'd miss sprint/quali results all of Saturday."
          whatToDo={[
            "Partially fixed: now uses race_start <= now+3d AND race_start >= now-7d",
            "Individual session gating added: only fetch quali results if quali_start <= now",
            "Monitor during Chinese GP to confirm fix works — especially sprint weekend"
          ]}
          impact="Sprint and qualifying results now sync as sessions complete, not just on race day."
        />

      </Section>

      {/* ── FEATURES ── */}
      <Section title="Feature Backlog">

        <BacklogItem
          id="F-01"
          priority="P3"
          title="Push notifications when results are in"
          status="backlog"
          addedBecause="Users currently only know results are in by opening the app. A push notification or WhatsApp message when qualifying/race results are published would drive re-engagement."
          whatToDo={[
            "Option A: Browser push notifications (Web Push API) — requires VAPID keys, service worker",
            "Option B: WhatsApp via Twilio or similar — requires user phone numbers",
            "Option C: Email notification when results sync — simpler, uses existing email infra",
            "Easiest: add a 'results published' email trigger in syncResults() after recompute"
          ]}
          impact="Re-engagement immediately after results. The exciting moment of seeing your score."
        />

        <BacklogItem
          id="F-02"
          priority="P3"
          title="Season end summary / recap page"
          status="backlog"
          addedBecause="At the end of the 2026 season, there's no way to see season highlights: who won, most exact hits, biggest single race score, most consistent, worst single race prediction, etc."
          whatToDo={[
            "Create /recap page (accessible after last race)",
            "Stats: winner, most exacts, best single race, most consistent (lowest variance)",
            "Fun stats: worst prediction of the season, biggest comeback, etc.",
            "Shareable cards per player"
          ]}
          impact="Satisfying closure at season end. Shareable content."
        />

        <BacklogItem
          id="F-03"
          priority="P3"
          title="Head-to-head comparison between two players"
          status="backlog"
          addedBecause="Players want to compare their performance specifically against one friend, not just the full leaderboard."
          whatToDo={[
            "Add /compare?a=userId&b=userId route",
            "Side-by-side: race by race points, total, exact hits, best/worst race",
            "Who won more head-to-heads across completed races",
            "Link from leaderboard row (click a player to compare with yourself)"
          ]}
          impact="More social engagement between specific rivalries."
        />

        <BacklogItem
          id="F-04"
          priority="P3"
          title="Pick history page per player"
          status="backlog"
          addedBecause="No way to see all of a player's predictions across the full season in one view."
          whatToDo={[
            "Profile page expansion: table of all races, picks submitted, points scored",
            "Show accuracy by driver (which drivers you tend to pick correctly vs not)",
            "Only visible to the logged-in user for their own data"
          ]}
          impact="Insight into personal prediction patterns over the season."
        />

        <BacklogItem
          id="F-05"
          priority="P3"
          title="Race weekend dedicated page"
          status="backlog"
          addedBecause="Currently results are on the results page split by race. A dedicated /race/[id] page could show the full weekend story: schedule, picks, results, league table, all in one place."
          whatToDo={[
            "Create /race/[raceId] page",
            "Shows: weekend schedule, qualifying result, sprint result (if applicable), race result",
            "Your picks and score inline",
            "League picks table at bottom",
            "Share link per race weekend"
          ]}
          impact="Single destination for everything about one race weekend."
        />

      </Section>

      {/* ── KNOWN ISSUES ── */}
      <Section title="Known Issues (not yet fixed)">

        <BacklogItem
          id="KI-01"
          priority="P2"
          title="Sprint has_sprint flag may be incorrect for some races"
          status="backlog"
          addedBecause="The has_sprint flag is set during calendar sync. Chinese GP (March 13-15) is a sprint weekend. If OpenF1 doesn't correctly mark it, sprint results won't be synced and sprint picks won't be requested."
          whatToDo={[
            "Verify has_sprint = true for Chinese GP (jolpi/openf1 race 1280) in DB",
            "Run: SELECT id, grand_prix, has_sprint FROM race_weekends WHERE has_sprint = true",
            "Should include: Chinese, Miami, Canadian, British, Dutch, Singapore for 2026"
          ]}
          impact="Sprint sessions silently skipped if flag is wrong."
        />

        <BacklogItem
          id="KI-02"
          priority="P2"
          title="Driver number 3 (Verstappen) shows as '#3' not full name"
          status="partial"
          addedBecause="OpenF1 returned empty full_name for driver_number=3 in a sync run, overwriting the stored name. A 'Fix driver names' admin button was added to repair all affected drivers, but the crossref table (TD-01) is the permanent fix."
          whatToDo={[
            "Run 'Fix driver names' from admin panel after each deploy until TD-01 is done",
            "Monitor: check /results after Chinese GP to verify all drivers show correct names",
            "Permanent fix: TD-01 crossref tables"
          ]}
          impact="Wrong names in results and picks views for affected drivers."
        />

      </Section>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function BacklogItem({
  id, priority, title, status, addedBecause, whatToDo, impact
}: {
  id: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  status: "backlog" | "in-progress" | "partial" | "done";
  addedBecause: string;
  whatToDo: string[];
  impact: string;
}) {
  const priorityColors = {
    P1: "bg-red-900/40 border-red-800/50 text-red-300",
    P2: "bg-yellow-900/40 border-yellow-800/50 text-yellow-300",
    P3: "bg-slate-800 border-slate-700 text-slate-400"
  };
  const statusColors = {
    backlog: "text-slate-500",
    "in-progress": "text-blue-400",
    partial: "text-yellow-400",
    done: "text-emerald-400"
  };
  const statusLabels = {
    backlog: "○ Backlog",
    "in-progress": "◎ In progress",
    partial: "◑ Partial fix",
    done: "✓ Done"
  };

  return (
    <div className="border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="font-mono text-xs text-slate-600 shrink-0 mt-0.5">{id}</span>
        <span className={`text-xs border px-2 py-0.5 rounded shrink-0 ${priorityColors[priority]}`}>{priority}</span>
        <h3 className="font-semibold text-white flex-1 min-w-0">{title}</h3>
        <span className={`text-xs shrink-0 ${statusColors[status]}`}>{statusLabels[status]}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Why it was added</p>
          <p className="text-slate-400 leading-relaxed">{addedBecause}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">What needs to be done</p>
          <ul className="space-y-1">
            {whatToDo.map((item, i) => (
              <li key={i} className="text-slate-400 flex gap-2">
                <span className="text-slate-600 shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Impact if resolved</p>
          <p className="text-emerald-400/80 text-xs">{impact}</p>
        </div>
      </div>
    </div>
  );
}
