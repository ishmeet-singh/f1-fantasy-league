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

      {/* ── ENGAGEMENT ROADMAP ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400 space-y-1">
        <p className="font-semibold text-white">Engagement roadmap</p>
        <p>
          KPI: engagement, retention and usage. Today the only touchpoint is the pre-deadline reminder email —
          nothing pulls players back after results, during sessions, between races or in the off-season.
          Phases are ordered by impact vs effort and by the season calendar (2026 ends in December).
        </p>
      </div>

      <Section title="Phase 1 — Now (before season end)">

        <BacklogItem
          id="E-01"
          priority="P1"
          title="Product analytics + engagement events"
          status="backlog"
          addedBecause="There is no analytics in the app, so there's no way to tell whether any feature below moves engagement. Needs to land first to get a baseline."
          whatToDo={[
            "Add Vercel Analytics (page views) or PostHog (events + funnels)",
            "Track: picks_submitted (per race/session), results_viewed, leaderboard_viewed, share_clicked",
            "Track email clicks via UTM params on reminder + results email links",
            "Baseline metrics: pick submission rate per race, % of players returning within 24h of results, weekly active players"
          ]}
          impact="Every later feature can be measured against a baseline."
        />

        <BacklogItem
          id="F-01"
          priority="P1"
          title="'Results are in' notification with your score + rank change"
          status="backlog"
          addedBecause="Users only know results are in by opening the app. The moment of seeing your score is the most exciting moment of the weekend and nothing currently triggers it."
          whatToDo={[
            "Send email after recompute publishes a session's scores (hook into result publish, not every recompute)",
            "Content: your session points, weekend total, league rank before → after, who overtook you / who you overtook",
            "Dedupe via notification_log (one email per user per race session)",
            "Reuse email-brand.ts styling and Resend infra from reminder emails",
            "Later: deliver via web push once E-08 lands"
          ]}
          impact="Re-engagement immediately after results, every weekend."
        />

        <BacklogItem
          id="E-02"
          priority="P1"
          title="Shareable weekend score card (OG image)"
          status="backlog"
          addedBecause="The league's real social space is the WhatsApp group. Nothing in the app produces content worth pasting there."
          whatToDo={[
            "Add /api/og/weekend?race=…&user=… using next/og ImageResponse",
            "Card: player name, race, weekend points, league position, best pick highlight",
            "'Share' button on results page using Web Share API (fallback: copy link)",
            "Shared link unfurls with the card via openGraph metadata"
          ]}
          impact="Free distribution in the group chat; banter drives return visits."
        />

        <BacklogItem
          id="E-03"
          priority="P1"
          title="Pick consensus + contrarian highlights"
          status="backlog"
          addedBecause="League picks are already revealed per player after lock (LeaguePicks), but there's no aggregate view. The interesting story is 'everyone picked X, only you picked Y'."
          whatToDo={[
            "Consensus view per session: % of league picking each driver per position",
            "Flag unique / contrarian picks per player",
            "After results: highlight contrarian picks that paid off",
            "Surface on results tabs alongside LeaguePicks"
          ]}
          impact="Makes the post-lock window interesting and fuels banter."
        />

      </Section>

      <Section title="Phase 2 — Remaining 2026 races">

        <BacklogItem
          id="E-04"
          priority="P2"
          title="Live provisional scoring during sessions"
          status="backlog"
          addedBecause="Nothing happens in the app during qualifying/sprint/race itself. OpenF1 exposes live positions and we already have an authenticated token (openf1-token.ts)."
          whatToDo={[
            "Poll OpenF1 live positions every 30–60s while a session is running",
            "Score current positions with scoring.ts (pure function) — never write to scores table",
            "Live page: provisional league table, your provisional points, biggest movers",
            "Clearly label as provisional; official scoring still runs from stable result sets"
          ]}
          impact="Turns the app into a second screen during races — biggest single engagement lever."
        />

        <BacklogItem
          id="F-03"
          priority="P2"
          title="Head-to-head comparison + pinned rival"
          status="backlog"
          addedBecause="Players want to compare their performance specifically against one friend, not just the full leaderboard."
          whatToDo={[
            "Add /compare?a=userId&b=userId route",
            "Side-by-side: race by race points, total, exact hits, best/worst race",
            "Who won more head-to-heads across completed races",
            "Link from leaderboard row (click a player to compare with yourself)",
            "Optional: pin a rival on profile; show 'you vs rival' on dashboard and in results email"
          ]}
          impact="More social engagement between specific rivalries."
        />

        <BacklogItem
          id="E-05"
          priority="P2"
          title="Streaks + achievements / badges"
          status="backlog"
          addedBecause="Players far down the leaderboard have little reason to keep submitting. Small personal wins keep them engaged."
          whatToDo={[
            "Submission streak (consecutive weekends with picks submitted)",
            "Badges: Perfect Podium, Exact P10, Contrarian (correct pick few others made), Comeback, Clean Sweep",
            "Compute deterministically during recompute (user_achievements table)",
            "Show on profile + leaderboard row; mention newly earned badges in results email"
          ]}
          impact="Habit loop + identity; retention for players not in title contention."
        />

      </Section>

      <Section title="Phase 3 — Season finale (December)">

        <BacklogItem
          id="F-02"
          priority="P2"
          title="Season Wrapped / recap page"
          status="backlog"
          addedBecause="At the end of the 2026 season, there's no way to see season highlights: who won, most exact hits, biggest single race score, most consistent, worst single race prediction, etc."
          whatToDo={[
            "Create /recap page (accessible after last race)",
            "Stats: winner, most exacts, best single race, most consistent (lowest variance)",
            "Fun stats: worst prediction of the season, biggest comeback, favourite driver, etc.",
            "Story-style per-player slides + shareable cards (reuse E-02 OG infra)",
            "Send recap email after final race"
          ]}
          impact="Peak retention moment of the year; sets up return for 2027."
        />

      </Section>

      <Section title="Phase 4 — Off-season (ready for 2027)">

        <BacklogItem
          id="E-06"
          priority="P2"
          title="Multiple leagues with invite links"
          status="backlog"
          addedBecause="The app supports exactly one private group. Letting anyone create a league and share a join link is the biggest usage multiplier."
          whatToDo={[
            "Tables: leagues, league_members (role: owner/member), invite codes",
            "Scope leaderboards, league picks, notifications by league",
            "RLS policies per league membership",
            "Migrate existing group into a default league",
            "Join flow: /join/[code] → magic link → added to league"
          ]}
          impact="Growth beyond one friend group. Largest change — schedule for off-season."
        />

        <BacklogItem
          id="E-07"
          priority="P2"
          title="Pre-season long-term predictions"
          status="backlog"
          addedBecause="Weekly picks give no reason to care about the season arc or to visit in the off-season."
          whatToDo={[
            "Before round 1: predict Drivers' champion, Constructors' champion, first-time winner, most DNFs, etc.",
            "Locked until season end; scored at the final race",
            "Separate points pool or bonus on top of best-18 total (decide before launch)"
          ]}
          impact="Year-long investment; off-season engagement."
        />

        <BacklogItem
          id="E-08"
          priority="P2"
          title="Installable app (PWA) + web push notifications"
          status="backlog"
          addedBecause="No manifest or service worker. Email is slow and easy to miss for time-critical nudges, and magic-link re-login adds friction."
          whatToDo={[
            "Add manifest + icons + service worker",
            "Web Push (VAPID) subscriptions stored per user",
            "Deliver reminders (picks lock in 1h) and results-in (F-01) via push, email as fallback",
            "Per-user notification preferences on profile"
          ]}
          impact="Higher pick submission rate and faster return after results."
        />

        <BacklogItem
          id="E-09"
          priority="P3"
          title="Weekend bonus questions"
          status="backlog"
          addedBecause="Picks are one visit per session. Quick side-questions give another reason to come back mid-week."
          whatToDo={[
            "Per-race questions: fastest lap, Driver of the Day, safety car yes/no, first DNF, teammate battle",
            "Small separate points pool so best-18 fairness is preserved",
            "Admin can configure/resolve questions where data isn't available from APIs"
          ]}
          impact="Extra touchpoints per weekend."
        />

        <BacklogItem
          id="E-10"
          priority="P3"
          title="Joker chips (double points)"
          status="backlog"
          addedBecause="No strategic layer beyond the picks themselves; players far behind have no way to catch up."
          whatToDo={[
            "N jokers per season; apply to one session before lock to double its points",
            "Define interaction with best-18 dropping rule",
            "Store in predictions/weekend metadata so recompute stays deterministic"
          ]}
          impact="Strategy + comeback potential keeps the mid-table engaged."
        />

        <BacklogItem
          id="F-04"
          priority="P3"
          title="Pick history + personal prediction insights"
          status="backlog"
          addedBecause="No way to see all of a player's predictions across the full season in one view, or learn from patterns."
          whatToDo={[
            "Profile page expansion: table of all races, picks submitted, points scored",
            "Accuracy by driver ('you overrate Hamilton by 2.3 places on average')",
            "Accuracy trend over the season, best/worst circuit types",
            "Build on personal-stats.ts; only visible to the logged-in user for their own data"
          ]}
          impact="Insight into personal prediction patterns; reason to revisit profile."
        />

      </Section>

      <Section title="Unscheduled">

        <BacklogItem
          id="E-11"
          priority="P3"
          title="Smart pick pre-fill"
          status="backlog"
          addedBecause="Missing a weekend often comes from friction, not lack of interest."
          whatToDo={[
            "Pre-fill race picks from qualifying result or your previous picks",
            "Adjust with existing drag-and-drop; explicit 'submit' still required"
          ]}
          impact="Fewer skipped sessions."
        />

        <BacklogItem
          id="E-12"
          priority="P3"
          title="Calendar subscription (.ics) with pick deadlines"
          status="backlog"
          addedBecause="Deadlines only live in the app and reminder emails."
          whatToDo={[
            "Per-user .ics feed: session times + pick lock deadlines",
            "'Add to calendar' link on profile and dashboard"
          ]}
          impact="Every race weekend lands in players' calendars."
        />

        <BacklogItem
          id="E-13"
          priority="P3"
          title="Reactions / banter on race results"
          status="backlog"
          addedBecause="Banter happens off-platform; light in-app reactions keep some of it next to the results."
          whatToDo={[
            "Emoji reactions on each player's weekend result",
            "Optional short comment thread per race"
          ]}
          impact="Social presence on results pages."
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
          id="KI-03"
          priority="P1"
          title="Cancelled races (Bahrain R4, Saudi R5) break next race logic"
          status="done"
          addedBecause="Bahrain GP (April 12) and Saudi Arabian GP (April 19) were cancelled mid-season. The getNextRace() function found 'first race with no results' — since cancelled races have no results but their dates have passed, Bahrain showed as 'next race' on the dashboard instead of Miami GP (May 3)."
          whatToDo={[
            "Fixed: getNextRace() now requires race_start > now in addition to no results",
            "Cancelled races (past date, no results) are correctly skipped",
            "Season progress still shows 3/24 (only races that actually happened count)"
          ]}
          impact="Dashboard correctly shows Miami GP as next race."
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
