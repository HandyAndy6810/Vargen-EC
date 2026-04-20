# Handoff: Home — "Mission Control" Redesign

## Overview
Complete redesign of the **Home** page for **Vargenezey (VGN-EC)** — the mobile-first tradie app. A bolder, eye-popping direction that keeps the existing Safety Orange accent but makes it a hero color, introduces editorial-scale typography, and adds a new floating **liquid-glass** bottom navigation.

This handoff replaces:
- `client/src/pages/Home.tsx`
- `client/src/components/Navigation.tsx` (bottom nav only — same file, `BottomNav` export)

Small additions to `client/src/index.css` may be needed (see **CSS Additions**).

## About the Design Files
The files bundled here (`Home Hi-Fi.html`, `lib/mission-control.jsx`, `lib/ios-frame.jsx`) are **design references created in HTML/React-via-Babel** — prototypes showing intended look, layout, and behavior. They are **not production code**. The task is to **recreate the design inside the existing VGN-EC codebase** (React 18 + TypeScript + Tailwind + shadcn/ui + wouter + TanStack Query), using the app's established patterns:

- Tailwind classes + CSS variables (`hsl(var(--primary))` etc.), not inline style objects
- `cn()` util from `@/lib/utils`
- Existing data hooks: `useJobs`, `useQuotes`, `useInvoices`, `useFollowUpsDue`, `useCustomers`, `useWidgetConfig`
- `wouter` `Link` + `useLocation` for routing
- `lucide-react` icons (don't inline SVGs)
- `date-fns` for date math (`isToday`, `startOfWeek`, `endOfWeek`, `format`)
- Existing sheets/modals: `QuickQuoteSheet`, `WidgetCustomiseSheet`, `JobCompletionModal`, `ActiveTimerBanner`
- Manrope font (already imported in `index.css`)

## Fidelity
**High-fidelity.** Final colors, spacing, typography and type scale are locked. Recreate pixel-close to the HTML prototype, but adapt to Tailwind utilities and your design token system. Don't port inline styles verbatim.

---

## Screens

### Home page (`/`)

**Purpose:** The daily "mission control" a tradie sees on open. Shows next job, quick AI quote entry, weekly revenue goal, quote pipeline summary, today's schedule, and recent activity.

**Layout (top → bottom, all centered, `max-w-2xl mx-auto`, `pb-32` for floating nav clearance):**

1. **Top bar** (56px top padding, 20px horizontal)
   - Left: avatar — 40×40px, `rounded-full`, background `bg-secondary` (near-black `#0f0e0b`), initials in **primary orange** `#f26a2a`, `font-extrabold`, text `text-sm`.
   - Right: weather pill — `rounded-full`, `px-3 py-1.5`, glass background `bg-white/70 backdrop-blur-md` with `border border-black/5`. Contains a 26px blue-tinted sun circle (☀), temperature (`24°`, `text-xs font-bold`), and location (`· Sydney`, `text-xs text-muted-foreground`).

2. **Headline** (`px-5 pt-6`)
   - Eyebrow: `text-[10px] font-extrabold tracking-[2px] uppercase text-muted-foreground` → `Sun 19 Apr · 07:42` (date from `format(now, "EEE d MMM · HH:mm")`).
   - Greeting: two lines, **`text-[42px] font-extrabold leading-[0.98] tracking-[-1.5px]`**. Line 1: `G'day,`. Line 2: user's first name, coloured `text-primary` with trailing period.
   - Subtitle: `text-sm text-foreground/70 mt-2.5 leading-snug max-w-[280px]`. Format: `"{N} jobs booked today. ${X} til you hit weekly goal. "` followed by `"Let's not touch a single form."` in `text-muted-foreground`.

3. **Hero card — Next Job** (`mx-5 mt-5`, `rounded-[28px] p-5`, `bg-secondary` (near-black), `text-white`, shadow `shadow-2xl`)
   - Absolute overlay: top-right radial glow, `w-[140px] h-[140px]`, `bg-[radial-gradient(circle_at_top_right,theme(colors.primary),transparent_70%)] opacity-45 pointer-events-none`.
   - Top row: pulsing orange dot + `text-[10px] font-extrabold tracking-[2px] uppercase text-white/60` "Up next · 9:30 am". Right: duration pill `bg-white/10 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold tracking-wider` "1H 45M".
   - Title: `text-[26px] font-extrabold leading-[1.1] tracking-[-0.6px]` across 2 lines (job title — customer).
   - Meta: `text-[13px] text-white/55 mb-4` — address + drive time.
   - Action row: three buttons, `gap-2`:
     - **Start Job** — `flex-1 h-[52px] rounded-2xl bg-primary text-white font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(242,106,42,0.45)]`. Content: `▶ Start job`. On press → `updateJob({ id, status: "in_progress" })`.
     - **Map** — `w-[52px] h-[52px] rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center`. Icon: `MapPin`.
     - **Message** — same as map but icon `MessageCircle`.

   *Empty state* (no `heroJob`): same card, different copy — eyebrow "Today", title "No jobs scheduled.", subtitle "Your day is open — send a quote?", one pill CTA "Quick quote" that opens `QuickQuoteSheet`.

   *Active/in-progress variant* (matches current Home behaviour): eyebrow becomes `▶ In Progress`, primary button becomes `Mark Complete` (opens `JobCompletionModal`).

4. **AI Rail** (`mx-5 mt-3.5`, `rounded-3xl p-4.5` = `p-[18px]`, `bg-primary text-white`, shadow `shadow-[0_14px_28px_rgba(242,106,42,0.3)]`, `relative overflow-hidden`)
   - Absolute texture overlay: `bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_40%)]`.
   - Row (`flex items-center gap-3`):
     - Left icon chip: `w-12 h-12 rounded-2xl bg-white/20 border border-white/35 flex items-center justify-center text-[22px]`. Glyph: `✦` (sparkles).
     - Middle: eyebrow `text-[10px] font-extrabold tracking-[2px] uppercase text-white/75` → "Quote with a sentence". Below: `text-base font-extrabold tracking-tight mt-1 leading-tight` — a rotating/placeholder example prompt like `"Swap hot water at Dalton's, $1,840..."`.
     - Right: `w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center text-lg`. Icon: `Mic` (lucide).
   - Tapping the card navigates to `/conversations/new` (or opens the AI chat sheet — matches current chat integration at `/api/conversations`).

5. **Goal block — Weekly Revenue** (`mx-5 mt-3.5`, `rounded-3xl`, `bg-[#fff8ef]` (cream), `p-5 pb-[18px]`, `border border-black/5`)
   - Eyebrow: "Week 16 revenue" (compute ISO week from `date-fns`).
   - Big number row (`flex items-end gap-3 mt-2 mb-3.5`): `text-[44px] font-extrabold tracking-[-1.5px] leading-[0.95]` for `$3,120`. Then `text-sm text-muted-foreground font-semibold mb-1.5` → `/ $5,000 goal` (goal from `localStorage.vargenezey_weekly_revenue_goal`; hide entire block if goal is 0/unset — match existing `WeeklyRevenueGoalWidget` behaviour).
   - Progress bar: `relative h-2.5 rounded-full bg-[#efe9dd] overflow-hidden mb-2.5`. Fill: absolute inset, width `${pct}%`, `bg-[linear-gradient(90deg,theme(colors.primary),#d94d0e)] rounded-full`. Three milestone ticks at 25/50/75% — `w-[1.5px] top-0.5 bottom-0.5 bg-white/60`.
   - Caption row: `flex justify-between text-[11px] text-foreground/70 font-semibold`. Left: `<b class="text-primary">62%</b> there · $1,880 to go`. Right: `3 jobs booked`.

6. **Pipeline** (`mt-3.5`)
   - Header row (`px-5 mb-3 flex justify-between items-baseline`):
     - Left stacked: eyebrow "Quote pipeline" + `text-lg font-extrabold tracking-tight mt-0.5` with `"16 on the go · "` then `"$4,240 out"` in `text-primary`. Sums from `quotes` hook.
     - Right: `text-[11px] font-extrabold text-primary` "See all →" → `<Link href="/quotes">`.
   - Horizontal scroll rail (`flex gap-2.5 px-5 pb-1 overflow-x-auto no-scrollbar`):
     - Four chips, each `min-w-[108px] rounded-[20px] p-3.5 border-[1.5px]`. Stacks: big number (`text-[28px] font-extrabold tracking-tight leading-none`) + label eyebrow.
     - **Draft**: bg `#fff`, text `text-muted-foreground`, border `border-foreground/14`.
     - **Sent**: bg `#eaf2ff`, text `#1f6feb`, border `#c8dcff`.
     - **Accepted**: bg `#e5f6eb`, text `#2a9d4c`, border `#bde2c9`.
     - **Overdue**: bg `#ffe6d3` (orangeSoft), text `text-primary`, border `#f8c59f`.
   - Counts come from `quotes.filter(q => q.status === '…')`.

7. **Today's schedule** (`mx-5 mt-4.5`)
   - Header (same pattern): eyebrow "Today · {N} stops" + `text-lg font-extrabold tracking-tight` headline like "Out the door by 9." Right link "Calendar →" → `/jobs`.
   - Job rows. **Each row is a flex container** (`flex items-stretch gap-3`) with two children:
     - **Left gutter** (`w-[54px] shrink-0 relative flex flex-col items-end pt-1.5 pr-3.5`)
       - Time hour: `text-xs font-extrabold leading-none`, color `text-foreground`.
       - AM/PM: `text-[9.5px] font-extrabold tracking-wider uppercase text-muted-foreground mt-0.5`.
       - Vertical rail: absolute, `right-[5px] top-[22px]`, `bottom-[-14px]` (or `h-5` on last row), `w-0.5`, background = dot color, `opacity-30`.
       - Dot: absolute, `right-[-1px] top-1.5`, `w-3 h-3 rounded-full`, 3px white border, `ring-[1.5px] ring-[dotColor]` (boxShadow trick).
         Dot color: `text-primary` if status === "next"/in-progress, `#1f6feb` if it's a quote visit, else `text-foreground`.
     - **Card** (`flex-1 min-w-0 bg-card border border-black/5 rounded-[18px] px-3.5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]`, margin-bottom `mb-3.5` unless last)
       - Top row flex with `items-baseline gap-2 justify-between`: title `text-sm font-extrabold tracking-tight` + duration badge `text-[10px] font-extrabold text-muted-foreground tracking-wider shrink-0` (e.g. `90m`).
       - Subtitle `text-[11px] text-muted-foreground mt-0.5` — customer · suburb.
       - Conditional AI tag when it's a quote visit: `inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-[#ffe6d3] text-[#d94d0e] text-[9.5px] font-extrabold tracking-wider uppercase`. Text: `✦ AI pre-draft ready`.

8. **Activity ticker** (`mx-5 mt-5.5`)
   - Eyebrow: "Activity · Last 24h".
   - `bg-card border border-black/5 rounded-[22px] overflow-hidden`
   - Rows (`flex items-center gap-3 p-3.5 border-t border-black/5` (except first)):
     - 32×32 `rounded-xl` icon chip — tone-coloured bg + fg:
       - Accepted: `bg-[#e5f6eb] text-[#2a9d4c]`, glyph `✓` (or lucide `Check`).
       - Opened: `bg-[#eaf2ff] text-[#1f6feb]`, glyph `◐` (or lucide `Eye`).
       - Overdue: `bg-[#ffe6d3] text-primary`, glyph `!` (or lucide `AlertCircle`).
     - Body: `text-[13px] font-medium`, customer/invoice name bolded.
     - Right: amount (`text-xs font-extrabold` coloured by tone) + `text-[10px] text-muted-foreground font-semibold` relative time.
   - Populate from the existing `/api/activity` endpoint (same source as `RecentActivityBlade`).

9. **Footer signature** (`px-5 pt-6 text-center`)
   - `text-[11px] text-muted-foreground font-semibold` — "Admin for people who'd rather be on the tools."
   - `text-[10px] text-muted-foreground font-extrabold tracking-[2px] uppercase mt-1.5` — "VARGENEZEY · v1.0".

---

### Bottom navigation (`client/src/components/Navigation.tsx` — `BottomNav`)

Replaces the current liquid-glass nav. Same 5 routes, same active-detection logic (`useLocation` startsWith match). Key differences:

- **Floating**: `position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); width: calc(100% - 44px); max-width: 340px;`. No longer stretches edge-to-edge.
- **Shape**: `rounded-[30px] p-[5px] flex`.
- **Glass tint**: `bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.38)_100%)] backdrop-blur-[28px] backdrop-saturate-[220%] border border-white/70`.
- **Shadow stack** (single `box-shadow` string — put in `index.css` as a utility):
  ```
  0 18px 40px rgba(20,19,16,0.18),
  0 4px 12px rgba(20,19,16,0.08),
  inset 0 1.5px 0 rgba(255,255,255,0.9),
  inset 0 -1px 0 rgba(20,19,16,0.06),
  inset 1px 0 0 rgba(255,255,255,0.5),
  inset -1px 0 0 rgba(255,255,255,0.5)
  ```
- **Specular streak**: an absolutely-positioned `div` inside the nav, `top-0.5 left-2.5 right-2.5 h-3 rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent)] pointer-events-none`.
- **Nav buttons** (5 equal flex items):
  - Inactive: `flex-1 py-2 flex flex-col items-center gap-0.5 rounded-3xl`. Icon in `rgba(20,19,16,0.5)`, label `opacity-0` (kept in DOM for height stability).
  - Active: adds its own inner-glass pill — `bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.75))] border-[0.5px] border-white/90 shadow-[0_2px_8px_rgba(20,19,16,0.08),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(20,19,16,0.04)]`. Icon + label both in `text-primary`.
  - Icon sizes: 20×20, `strokeWidth={2.2}`. Use lucide: `Home`, `ClipboardList`, `FileText`, `CalendarDays`, `UserRound`.
  - Label `text-[9px] font-extrabold tracking-wide h-2.5` (invisible when inactive).
- Keep the existing sliding-pill animation **OR** replace with the simpler per-button inner pill shown above — both are valid; the handoff design uses the simpler version.
- Keep the `action pill` slide-in feature from the current Navigation — it's out of scope for this redesign but shouldn't be removed.

---

## Interactions & Behavior

- Hero **Start Job** → calls `useUpdateJob()` with `status: "in_progress"`. If hero is already in progress, button becomes **Mark Complete** → opens `JobCompletionModal` (existing component).
- Hero **Details** / card body tap → `Link href={`/jobs/${heroJob.id}`}`.
- AI Rail tap → navigate to AI chat (new conversation). Long-press → start voice recording (optional, use existing `useVoiceRecorder` hook).
- Pipeline chip tap → `/quotes?status={stage}` (if you support query filters) or just `/quotes`.
- Today schedule row tap → `/jobs/${id}`.
- Activity row tap → target entity (`/quotes/${id}` or `/invoices/${id}`).
- Weather pill tap → optional, link to a detailed forecast sheet (reuse `WeatherWidget` logic).
- Top-right 40×40 avatar tap → `/profile`. (The current Home has a `LayoutGrid` "customise" button instead — keep the customise affordance somewhere, maybe long-press on a blade, or move it into `/profile` settings.)
- Scrolling: the floating nav stays in view. Add a bottom safe-area inset (iOS) via `env(safe-area-inset-bottom)`.
- All press states: `active:scale-[0.98] transition-transform` on cards/buttons (match existing app convention).

## State Management
Use existing hooks — no new global state needed.

- `useJobs()`, `useQuotes()`, `useInvoices()`, `useFollowUpsDue()`, `useCustomers()`, `useUpdateJob()`, `useWidgetConfig()`.
- `useAuth()` for the user's first name (avatar initials + greeting).
- `useState` locally for `completionJob`, `showQuickQuote`.
- Weekly revenue goal: `localStorage.vargenezey_weekly_revenue_goal` (number). If 0 or unset → hide the goal block entirely (matches existing `WeeklyRevenueGoalWidget`).
- Pipeline counts: derive from `quotes`.
- Pipeline "$ out": sum `totalAmount` where status in `['sent','viewed']`.
- Activity feed: `GET /api/activity` — map the top 3.

---

## Design Tokens

Most already exist in `client/src/index.css` and `tailwind.config.ts` — **reuse them**, don't hardcode.

**Existing tokens to use:**
- `--primary: 18 90% 55%` → **Safety Orange `#f26a2a`** (hero color in this design).
- `--background: 30 20% 96%` → warm off-white paper.
- `--card`, `--foreground`, `--muted-foreground`, `--border`, etc. — all already correct.
- `--radius: 1.5rem` — matches the big rounded corners used throughout.
- Font: Manrope (already imported).

**New raw values introduced in this design** (add as local constants or Tailwind theme extensions if you like):
- `orangeDeep: #d94d0e` — used in the revenue bar gradient, AI pre-draft tag text.
- `orangeSoft: #ffe6d3` — AI pre-draft pill bg, "Overdue" pipeline chip bg.
- `cream: #fff8ef` — Goal block background.
- Sent blue: `#1f6feb` / bg `#eaf2ff` / border `#c8dcff`.
- Accepted green: `#2a9d4c` / bg `#e5f6eb` / border `#bde2c9`.
- Paper deep: `#efe9dd` (progress bar track).
- Near-black hero bg: `#0f0e0b` (slightly warmer than pure `--foreground`).

**Type scale used:**
- Hero greeting: 42/0.98, `tracking-[-1.5px]`, `font-extrabold`.
- Hero card title: 26/1.1, `tracking-[-0.6px]`, `font-extrabold`.
- Big $ figure: 44/0.95, `tracking-[-1.5px]`, `font-extrabold`.
- Pipeline number: 28/1, `tracking-[-0.8px]`, `font-extrabold`.
- Section headlines: 18, `tracking-tight`, `font-extrabold`.
- Eyebrow labels: 10, `tracking-[2px]`, `uppercase`, `font-extrabold`, `text-muted-foreground`.
- Body: 13, `font-medium`.

**Radius:** 28 (hero), 24 (AI rail, goal block), 22 (activity card), 20 (pipeline chip), 18 (schedule card).

---

## CSS Additions

Add to `client/src/index.css` under `@layer components`:

```css
.nav-liquid-glass-v2 {
  background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.38) 100%);
  backdrop-filter: blur(28px) saturate(220%);
  -webkit-backdrop-filter: blur(28px) saturate(220%);
  border: 1px solid rgba(255,255,255,0.7);
  box-shadow:
    0 18px 40px rgba(20,19,16,0.18),
    0 4px 12px rgba(20,19,16,0.08),
    inset 0 1.5px 0 rgba(255,255,255,0.9),
    inset 0 -1px 0 rgba(20,19,16,0.06),
    inset 1px 0 0 rgba(255,255,255,0.5),
    inset -1px 0 0 rgba(255,255,255,0.5);
}

.dark .nav-liquid-glass-v2 {
  background: linear-gradient(180deg, rgba(30,28,24,0.6) 0%, rgba(30,28,24,0.45) 100%);
  border-color: rgba(255,255,255,0.1);
  box-shadow:
    0 18px 40px rgba(0,0,0,0.5),
    0 4px 12px rgba(0,0,0,0.3),
    inset 0 1.5px 0 rgba(255,255,255,0.1),
    inset 0 -1px 0 rgba(0,0,0,0.3);
}

.nav-pill-active-v2 {
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75));
  border: 0.5px solid rgba(255,255,255,0.9);
  box-shadow:
    0 2px 8px rgba(20,19,16,0.08),
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 -1px 0 rgba(20,19,16,0.04);
}

.dark .nav-pill-active-v2 {
  background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
  border-color: rgba(255,255,255,0.2);
  box-shadow:
    0 2px 8px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.2);
}
```

## Dark Mode

The prototype is light-mode only. Apply the same structure to dark mode using existing `.dark` CSS variables. Specific mappings:
- Hero card black → stays black (already works).
- Cream goal block bg → use `bg-card` (dark grey).
- Paper deep `#efe9dd` → `bg-muted`.
- Sent/Accepted/Overdue tints → use `@apply` with dark variants (e.g. `bg-blue-900/30 border-blue-800`).

---

## Assets
No image assets. All visuals are typography, CSS gradients, and lucide icons.

---

## Files in this bundle
- `Home Hi-Fi.html` — open in any browser to see the live prototype (mobile-frame at 402×874).
- `lib/mission-control.jsx` — the source of all the section components (`TopBar`, `Hero`, `AiRail`, `GoalBlock`, `Pipeline`, `TodaySchedule`, `ActivityTicker`, `Sig`, `BottomNav`, `MissionControl`). Read this to resolve any ambiguity in the spec above.
- `lib/ios-frame.jsx` — device bezel wrapper, not needed in the real app.

---

## Implementation Checklist (for Claude Code)

1. Rewrite `client/src/pages/Home.tsx` section-by-section, replacing the current `ALL_BLADES` + reorder mechanism with the fixed layout above. **Preserve** the existing blade-config hook import and the `ActiveTimerBanner` at the top, but remove the per-blade toggle rendering logic from Home (customisation can move to Profile or be deferred).
2. Rewrite `BottomNav` in `client/src/components/Navigation.tsx` to the new floating shape using `.nav-liquid-glass-v2` + `.nav-pill-active-v2` classes. Keep the `action` pill feature for pages that register one.
3. Add the CSS snippets above to `client/src/index.css`.
4. Run `npm run check` to catch TS errors.
5. Visual QA on iPhone 14/15 viewport width (390–402px). Check: nav doesn't overlap the footer signature; hero subtitle wraps nicely; pipeline chips scroll horizontally; timeline doesn't overlap cards.
6. Run on device via `npm run cap:run:ios` / `cap:run:android` once confident.
