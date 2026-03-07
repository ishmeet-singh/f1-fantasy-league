/**
 * DESIGN REFERENCE PAGE — /design
 *
 * This page is the live design document for F1 Friends League.
 * It contains wireframes, component specs, design decisions, and backlog.
 *
 * Both admin and developer use this as a reference before building anything new.
 * Update this page BEFORE implementing a feature, and update it AFTER as the source of truth.
 *
 * Accessible at: /design (no auth required — it's just docs)
 */

export default function DesignPage() {
  return (
    <div className="max-w-4xl space-y-16 py-4">

      {/* Header */}
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-bold text-white">F1 Friends League — Design Reference</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Live wireframes, component inventory, design decisions and feature backlog.
          Update this before building anything new.
        </p>
        <div className="flex gap-3 mt-4 text-xs">
          <span className="bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 px-2 py-1 rounded">✓ Shipped</span>
          <span className="bg-blue-900/40 border border-blue-800/50 text-blue-300 px-2 py-1 rounded">◎ In design</span>
          <span className="bg-slate-800 border border-slate-700 text-slate-400 px-2 py-1 rounded">○ Backlog</span>
          <span className="bg-yellow-900/40 border border-yellow-800/50 text-yellow-300 px-2 py-1 rounded">⚠ Known issue</span>
        </div>
      </div>

      {/* ── DESIGN PRINCIPLES ── */}
      <Section title="Design Principles">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Mobile-first", desc: "Every component designed for 375px first. Desktop enhancements are additive." },
            { title: "Clarity over cleverness", desc: "Users should never have to guess what a number means. Label everything." },
            { title: "Social engagement", desc: "The fun is comparing with friends. Surface others' picks, scores, and reactions at the right time." },
          ].map((p) => (
            <div key={p.title} className="card space-y-1">
              <p className="font-semibold text-white">{p.title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── COLOR / STATUS SYSTEM ── */}
      <Section title="Status Colors">
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: "Exact hit ✓", bg: "bg-emerald-900/40", border: "border-emerald-800/50", text: "text-emerald-300" },
            { label: "Points scored", bg: "bg-red-900/20", border: "border-red-900/40", text: "text-red-300" },
            { label: "Warning / unsaved", bg: "bg-yellow-900/40", border: "border-yellow-800/50", text: "text-yellow-300" },
            { label: "Locked session", bg: "bg-slate-700", border: "border-slate-600", text: "text-slate-400" },
            { label: "Open window", bg: "bg-emerald-900/30", border: "border-emerald-800/60", text: "text-emerald-300" },
            { label: "My row (leaderboard)", bg: "bg-red-950/40", border: "border-red-900/50", text: "text-white" },
          ].map((c) => (
            <span key={c.label} className={`${c.bg} border ${c.border} ${c.text} px-3 py-1.5 rounded-lg`}>
              {c.label}
            </span>
          ))}
        </div>
      </Section>

      {/* ── PAGE: DASHBOARD ── */}
      <Section title="Page: Dashboard ✓ Shipped">
        <div className="space-y-3">
          <Status status="shipped" label="Layout" note="Season banner → Next race + My season grid → My picks → Leaderboard" />
          <Status status="shipped" label="Next race card" note="GP name, countdown to qualifying, session times in local timezone" />
          <Status status="shipped" label="My picks card" note="Shows submitted picks per event with driver names. Red warning if window open and nothing submitted." />
          <Status status="shipped" label="Leaderboard" note="Player name (truncated), score, exact hits. Top 3 get medals." />
          <Status status="issue" label="Season progress bar" note="Shows Race X of 24. Currently counts races where quali_start < now, which may be off by 1 during an active weekend." />
        </div>

        <Wireframe title="Dashboard layout — mobile">
{`┌─────────────────────┐
│  2026 Season    1/24 │
├─────────────────────┤
│  Next Race           │
│  Australian GP       │
│  Qualifying in       │
│  02d 14h             │
│  Qualifying  Sat 7 Mar│
│  Race        Sun 8 Mar│
│  [Make picks →]      │
├──────────┬──────────┤
│ My Season│          │
│ #1 Rank  │ 42 pts   │
│ Best: 42 │ 3 exact  │
├─────────────────────┤
│  My Picks · Aus GP   │
│  Qualifying  Race    │ ← 2-col grid
│  P1 Russell P1 Russell│
│  P2 ...     P2 ...   │
│  [Edit picks →]      │
├─────────────────────┤
│  Leaderboard         │
│  🥇 ishmeet    42   │
│  🥈 Chakra     38   │
│  🥉 Player3    35   │
└─────────────────────┘`}
        </Wireframe>
      </Section>

      {/* ── PAGE: PICKS ── */}
      <Section title="Page: Picks ✓ Shipped">
        <div className="space-y-3">
          <Status status="shipped" label="Race pill selector" note="All 24 races. Green dot = window open. Click to navigate via ?race= param." />
          <Status status="shipped" label="Window not open" note="Shows schedule with local times and countdown." />
          <Status status="shipped" label="Editable form" note="Dropdowns per position. ✓ Saved badge. Unsaved changes badge. Update picks button." />
          <Status status="shipped" label="Locked summary" note="Clean read-only list: P1 · Russell · McLaren" />
          <Status status="shipped" label="Everyone's picks" note="Collapsible section after each locked session. Shows once session starts." />
        </div>

        <Wireframe title="Picks page — session locked state">
{`┌─────────────────────────────────┐
│ Picks                            │
│ [R1 Aus●][R2 Chi][R3 Jpn]...    │ ← pills, ● = open
├─────────────────────────────────┤
│ Australian Grand Prix            │
│ Race · Sun, 8 Mar                │
├─────────────────────────────────┤
│ Qualifying            [Locked]   │
│ P1 · George Russell              │
│ P2 · Kimi Antonelli              │
│ P3 · Isack Hadjar                │
├─────────────────────────────────┤
│ Everyone's picks  2 players  ▼  │ ← collapsed by default
│  ishmeet  P1 Russell P2 Antonelli│
│  Chakra   P1 Verstappen P2 Ham  │
├─────────────────────────────────┤
│ Race                  [Locks 2h] │
│ P1  [Select driver…]            │
│ P2  [Select driver…]            │
│ ...                              │
│ [Save picks]                     │
└─────────────────────────────────┘`}
        </Wireframe>
      </Section>

      {/* ── PAGE: RESULTS ── */}
      <Section title="Page: Results ✓ Shipped">
        <div className="space-y-3">
          <Status status="shipped" label="Race pill selector" note="Green dot = has results. Defaults to most recent race with results." />
          <Status status="shipped" label="My Picks (primary)" note="Shows your predictions with actual result alongside. P1 predicted → P3 actual → 8pt" />
          <Status status="shipped" label="Full Results toggle" note="Show/hide full finishing order. Hidden by default when user has picks." />
          <Status status="shipped" label="Everyone's picks" note="Visible once session locks. Upgrades with actual results when available." />
          <Status status="shipped" label="Weekend score card" note="Top right: total points + exact hits for the weekend." />
        </div>

        <Wireframe title="Results page — with results">
{`┌──────────────────────────────────┐
│ Results                           │
│ [R1●Aus][R2 Chi][R3 Jpn]...      │
├──────────────────────────────────┤
│ Australian Grand Prix    42 pts   │
│ 8 Mar 2026              3 exact   │
├────────────┬──────────────────────┤
│ Qualifying │ Sprint │ Race 10pt   │ ← tabs
│ 16pt       │        │             │
├──────────────────────────────────┤
│ 16 points  │ 3 exact hits         │
├──────────────────────────────────┤
│ My Picks           [Hide results↑]│
│ My pick  Driver   Actual  Pts     │
│ P1       Russell  P1 ✓    12pt   │
│ P2       Antonelli P3     8pt    │
│ P3       Hadjar   P2      8pt    │
├──────────────────────────────────┤
│ Everyone's picks          ▲ hide  │
│  ishmeet  P1 Russell✓ P2 Ant P3H │
│  Chakra   P1 Vers P2 Ham P3 Lec  │
└──────────────────────────────────┘`}
        </Wireframe>
      </Section>

      {/* ── PAGE: RULES ── */}
      <Section title="Page: Rules ✓ Shipped">
        <div className="space-y-3">
          <Status status="shipped" label="Overview, when to pick, scoring tables, max points reference" note="Full scoring breakdown per event. Perfect podium bonus highlighted." />
        </div>
      </Section>

      {/* ── PAGE: PROFILE ── */}
      <Section title="Page: Profile ✓ Shipped">
        <div className="space-y-3">
          <Status status="shipped" label="Avatar with initials" note="Derived from display name or email" />
          <Status status="shipped" label="Season stats" note="Rank, total points, best race, exact hits" />
          <Status status="shipped" label="Edit display name" note="Client-side update with Saved! feedback. Avatar updates instantly." />
        </div>
      </Section>

      {/* ── COMPONENT INVENTORY ── */}
      <Section title="Component Inventory">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase">
                <th className="pb-2 pr-4">Component</th>
                <th className="pb-2 pr-4">File</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ["Nav", "components/nav.tsx", "✓", "Sticky top. Active link underline. Admin link conditional."],
                ["PicksForm", "components/picks-form.tsx", "✓", "Open/locked/saved states. Countdown timer."],
                ["PicksRaceSelector", "components/picks-race-selector.tsx", "✓", "Pill row. Green dot = open. Click → ?race= URL."],
                ["LeaguePicks", "components/league-picks.tsx", "✓", "Collapsible. Upgrades when results arrive."],
                ["ResultsTabs", "components/results-tabs.tsx", "✓", "Tabs per event. My picks primary. Full results toggle."],
                ["Countdown", "components/countdown.tsx", "✓", "Live d/h/m/s. Hides seconds when >1 day."],
                ["LocalTime", "components/local-time.tsx", "✓", "Client-side, renders in browser timezone."],
                ["HashAuthHandler", "components/hash-auth-handler.tsx", "✓", "Handles magic link #access_token on login page."],
                ["AdminPanel", "components/admin-panel.tsx", "✓", "Players, test race, sync tools."],
                ["ProfileForm", "components/profile-form.tsx", "✓", "Client-side name edit with feedback."],
              ].map(([comp, file, status, note]) => (
                <tr key={comp} className="border-t border-slate-800/50">
                  <td className="py-2 pr-4 font-medium text-white">{comp}</td>
                  <td className="py-2 pr-4 text-xs text-slate-500 font-mono">{file}</td>
                  <td className="py-2 pr-4 text-emerald-400 text-xs">{status}</td>
                  <td className="py-2 text-xs text-slate-400">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── IN DESIGN: PICKS UX REDESIGN ── */}
      <Section title="◎ In Design — Picks Input UX (Mobile)">
        <p className="text-sm text-slate-400 leading-relaxed">
          Requested by players: replace the 10 dropdowns with a more touch-friendly interaction.
          Three options being considered. Decision needed before build.
        </p>

        <div className="space-y-2 mt-2">
          <Status status="design" label="Current state" note="10 native select dropdowns stacked. Works on desktop. Slow and fiddly on mobile." />
          <Status status="design" label="Constraint" note="Race = pick 10 FROM 22 drivers AND order them. Quali = pick 3 from 22 and order them." />
          <Status status="design" label="Decision needed" note="Which option to build? See wireframes below." />
        </div>

        {/* Option A */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-slate-800 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">Option A</span>
            <span className="text-white font-medium">Drag to reorder only</span>
            <span className="text-slate-400 text-sm">— minimal change</span>
          </div>
          <p className="text-sm text-slate-400">
            Keep the current selection mechanism (one driver per slot). Add drag handles so you can
            reorder your list after filling it. Lowest effort, lowest gain — still requires 10 taps
            to fill slots.
          </p>
          <Wireframe title="Option A — Race picks (mobile)">
{`┌─────────────────────────────┐
│ Race — Top 10                │
│                              │
│ ≡  P1  [Verstappen     ▼]   │  ← ≡ = drag handle
│ ≡  P2  [Norris         ▼]   │
│ ≡  P3  [Russell        ▼]   │
│ ≡  P4  [Leclerc        ▼]   │
│ ≡  P5  [Piastri        ▼]   │
│ ≡  P6  [Hamilton       ▼]   │
│ ≡  P7  [Antonelli      ▼]   │
│ ≡  P8  [Albon          ▼]   │
│ ≡  P9  [Hadjar         ▼]   │
│ ≡  P10 [Lawson         ▼]   │
│                              │
│ [  Save picks  ]            │
└─────────────────────────────┘

Interaction:
• Tap dropdown → native picker (same as now)
• Long-press ≡ handle → drag row up/down
• Positions auto-renumber as you drag

Pro: Familiar, small change
Con: Still 10 taps to fill. Drag+select = 2 UX modes`}
          </Wireframe>
        </div>

        {/* Option B */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-blue-900/50 border border-blue-700 text-blue-200 px-3 py-1 rounded-lg text-sm font-semibold">Option B ★</span>
            <span className="text-white font-medium">Tap to select + drag to order</span>
            <span className="text-blue-400 text-sm">— recommended</span>
          </div>
          <p className="text-sm text-slate-400">
            Two zones: a grid of all 22 driver chips at the bottom (pool), and a ranked list at
            the top (your picks). Tap a driver chip → it fills the next available slot. Tap a
            picked driver → removes them back to pool. Drag within the ranked list to reorder.
          </p>
          <Wireframe title="Option B — Race picks (mobile), empty state">
{`┌─────────────────────────────┐
│ Race — Pick your top 10      │
│ Tap drivers to add · 0/10    │
│                              │
│ ┌──────────────────────────┐ │
│ │  P1  ─ ─ ─ ─ ─ ─ ─ ─   │ │  ← empty slots
│ │  P2  ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ │  P3  ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ │  ...                     │ │
│ │  P10 ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ [Verstappen] [Norris]    │ │  ← driver chip grid
│ │ [Russell]    [Leclerc]   │ │
│ │ [Piastri]    [Hamilton]  │ │
│ │ [Antonelli]  [Albon]     │ │
│ │ [Hadjar]     [Lawson]    │ │
│ │ [Hulkenberg] [Bearman]   │ │
│ └──────────────────────────┘ │
└─────────────────────────────┘`}
          </Wireframe>
          <Wireframe title="Option B — Race picks (mobile), 4 selected">
{`┌─────────────────────────────┐
│ Race — Pick your top 10      │
│ Tap drivers to add · 4/10    │
│                              │
│ ┌──────────────────────────┐ │
│ │ ≡ P1  Verstappen    ✕   │ │  ← filled, ≡ drag, ✕ remove
│ │ ≡ P2  Norris        ✕   │ │
│ │ ≡ P3  Russell       ✕   │ │
│ │ ≡ P4  Leclerc       ✕   │ │
│ │    P5  ─ ─ ─ ─ ─ ─ ─   │ │  ← still empty
│ │    ...                   │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ [Piastri]    [Hamilton]  │ │  ← remaining pool
│ │ [Antonelli]  [Albon]     │ │
│ │ [Hadjar]     [Lawson]    │ │  (Verstappen/Norris/
│ │ [Hulkenberg] [Bearman]   │ │   Russell/Leclerc gone)
│ └──────────────────────────┘ │
│                              │
│ [  Save picks  ] disabled    │
└─────────────────────────────┘

Interaction:
• Tap chip → jumps to next empty slot
• Tap ✕ on picked driver → returns to pool
• Long-press ≡ → drag to reorder

Pro: Fast (10 taps to fill), clear visual
Con: Two-panel = more vertical scroll`}
          </Wireframe>
        </div>

        {/* Option C */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-slate-800 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">Option C</span>
            <span className="text-white font-medium">Ranked drag from pool</span>
            <span className="text-slate-400 text-sm">— most powerful, most complex</span>
          </div>
          <p className="text-sm text-slate-400">
            Single scrollable list. Top section is your ordered picks. Bottom section is the full
            driver pool. Drag a driver up from the pool into your picks list at any position.
            Drag within picks to reorder. Drag back down to remove.
          </p>
          <Wireframe title="Option C — Race picks (mobile), 3 picked">
{`┌─────────────────────────────┐
│ Race — Top 10  [3 / 10]      │
├──────────────────────────────┤
│ YOUR PICKS                   │
│ ≡  1  Verstappen         ✕  │  ← drag handle, remove
│ ≡  2  Norris             ✕  │
│ ≡  3  Russell            ✕  │
│                              │
│ ┄ drag more drivers here ┄  │  ← drop zone hint
├──────────────────────────────┤
│ DRIVER POOL                  │
│ ≡  Leclerc                  │  ← drag up to add
│ ≡  Piastri                  │
│ ≡  Hamilton                 │
│ ≡  Antonelli                │
│ ≡  Albon                    │
│ ≡  Hadjar                   │
│ ≡  Lawson                   │
│     ... 12 more ...          │
└─────────────────────────────┘

Interaction:
• Drag driver from pool UP into picks = add at position
• Drag within picks = reorder
• Drag driver from picks DOWN = remove

Pro: Single unified list, most powerful
Con: Hardest to implement, drag precision needed,
     unclear "drop here" targets on small screens`}
          </Wireframe>
        </div>

        {/* Comparison table */}
        <div className="mt-8">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Comparison</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase">
                  <th className="pb-2 pr-4">Criteria</th>
                  <th className="pb-2 pr-4">Option A</th>
                  <th className="pb-2 pr-4 text-blue-300">Option B ★</th>
                  <th className="pb-2">Option C</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ["Mobile ease", "★★☆", "★★★", "★★☆"],
                  ["Speed (10 picks)", "Slow", "Fast", "Medium"],
                  ["Implementation effort", "Low", "Medium", "High"],
                  ["Works without JS drag lib", "No", "Mostly", "No"],
                  ["Clear mental model", "Yes", "Yes", "Requires learning"],
                  ["Desktop friendly", "Yes", "Yes", "Yes"],
                ].map(([c, a, b, cc]) => (
                  <tr key={c} className="border-t border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-400">{c}</td>
                    <td className="py-2 pr-4">{a}</td>
                    <td className="py-2 pr-4 text-blue-300 font-medium">{b}</td>
                    <td className="py-2">{cc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-blue-950/30 border border-blue-800/40">
          <p className="text-sm font-semibold text-blue-300">Recommendation: Option B</p>
          <p className="text-sm text-slate-400 mt-1">
            Best balance of UX improvement and implementation effort. Tap-to-add is immediately
            intuitive, drag-to-reorder is a bonus. Can ship without a heavy drag library using
            a simple swap-on-tap pattern first, then add drag later.
          </p>
          <p className="text-sm text-slate-500 mt-2 italic">Status: Awaiting decision from team before build.</p>
        </div>
      </Section>

      {/* ── FEATURE BACKLOG ── */}
      <Section title="Feature Backlog">
        <div className="space-y-2">
          <BacklogItem status="backlog" title="Push notifications" note="Browser push or WhatsApp when results are in or when someone just submitted picks" />
          <BacklogItem status="backlog" title="Season end summary" note="End-of-season recap: top scorer, most exact hits, best single race, worst pick ever" />
          <BacklogItem status="backlog" title="Pick history" note="Per-user timeline of all picks across the season" />
          <BacklogItem status="backlog" title="Head-to-head" note="Compare your picks vs one specific player across races" />
          <BacklogItem status="backlog" title="Prediction accuracy stats" note="Which drivers you consistently over/underestimate" />
          <BacklogItem status="backlog" title="Race weekend page" note="Dedicated page per race with results, all picks, scores in one place" />
        </div>
      </Section>

      {/* ── KNOWN ISSUES ── */}
      <Section title="Known Issues">
        <div className="space-y-2">
          <BacklogItem status="issue" title="Jolpi results latency" note="Jolpi/Ergast publishes results hours after a session. Currently syncing from OpenF1 which is faster." />
          <BacklogItem status="issue" title="Sprint has_sprint flag" note="Check if OpenF1 correctly marks sprint weekends. Chinese, Miami, British, Dutch, Singapore, Canada should be true." />
          <BacklogItem status="issue" title="Driver count" note="2026 has 22 drivers. DB constraint updated but simulation/scoring fallback uses 22 as max." />
        </div>
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

function Status({ status, label, note }: { status: "shipped" | "design" | "backlog" | "issue"; label: string; note: string }) {
  const styles = {
    shipped: "bg-emerald-900/30 border-emerald-800/50 text-emerald-400",
    design: "bg-blue-900/30 border-blue-800/50 text-blue-400",
    backlog: "bg-slate-800 border-slate-700 text-slate-400",
    issue: "bg-yellow-900/30 border-yellow-800/50 text-yellow-400",
  };
  const icons = { shipped: "✓", design: "◎", backlog: "○", issue: "⚠" };
  return (
    <div className="flex gap-3 items-start text-sm">
      <span className={`shrink-0 border px-2 py-0.5 rounded text-xs font-mono ${styles[status]}`}>
        {icons[status]} {label}
      </span>
      <span className="text-slate-400 leading-relaxed">{note}</span>
    </div>
  );
}

function BacklogItem({ status, title, note }: { status: "backlog" | "issue"; title: string; note: string }) {
  return <Status status={status} label={title} note={note} />;
}

function Wireframe({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 leading-relaxed overflow-x-auto font-mono">
        {children}
      </pre>
    </div>
  );
}
