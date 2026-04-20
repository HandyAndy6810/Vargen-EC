# Claude Code Handoff — VGN-EC Mobile App UI Rebuild

You are working on `HandyAndy6810/Vargen-EC` (monorepo). All work is in the `mobile/` workspace, an Expo 52 / expo-router v4 / NativeWind 4 app. Server and schema live in `shared/` and `server/` — **do not modify them**. This is a UI rebuild only; all APIs, hooks, and data shapes stay intact.

The source of truth for the final look & feel is the HTML design file `VGN-EC App.html` (delivered alongside this prompt). Your job is to translate each screen in that prototype into native React Native, reusing existing hooks and API contracts.

---

## 0. Ground rules

1. **Branch.** Create `feat/ui-redesign-vgnec` off `main`. Commit per phase (one commit per screen at minimum). Open a PR when all phases pass lint + typecheck.
2. **Do NOT touch** `shared/**`, `server/**`, `mobile/app/(auth)/**`, `mobile/hooks/**`, `mobile/lib/api.ts`, or `mobile/lib/queryClient.ts`. If a hook is missing a feature you need, **add a new hook** in `mobile/hooks/` rather than edit existing ones.
3. **Typecheck + lint must pass** (`cd mobile && npx tsc --noEmit && npx expo lint`) before each commit.
4. **Never hardcode colors in screens** — use the theme tokens defined in step 1 below.
5. **Never invent API endpoints.** Every network call routes through `apiRequest` from `@/lib/api` and a route object in `@shared/routes`. If a feature needs a new endpoint, stub the UI with a TODO comment and flag it in the PR description.
6. **Ask before adding dependencies.** The only new deps this plan needs are listed in Phase 0.

---

## Phase 0 — Foundation (theme, fonts, icons, dependencies)

### 0.1 Install dependencies

```bash
cd mobile
npx expo install expo-blur expo-haptics
npx expo install @expo-google-fonts/manrope expo-font
```

(`expo-haptics` is likely already installed — verify.)

### 0.2 Rewrite `mobile/tailwind.config.js`

Replace the existing file with the full spec below. The current config has a blue `#2563eb` primary — the new design uses a warm orange/amber primary. Keep the `hsl(var(--...))` tokens for future dark mode but add a full scale.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Brand — warm orange/amber
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",   // primary
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        ink: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        primary:     { DEFAULT: "#ea580c", foreground: "#ffffff" },
        secondary:   { DEFAULT: "#f1f5f9", foreground: "#0f172a" },
        muted:       { DEFAULT: "#f8fafc", foreground: "#64748b" },
        accent:      { DEFAULT: "#fff7ed", foreground: "#ea580c" },
        destructive: { DEFAULT: "#ef4444", foreground: "#ffffff" },
        success:     { DEFAULT: "#10b981", foreground: "#ffffff" },
        warning:     { DEFAULT: "#f59e0b", foreground: "#ffffff" },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#ea580c",
        card: { DEFAULT: "#ffffff", foreground: "#0f172a" },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      fontFamily: {
        sans:   ["Manrope_500Medium"],
        medium: ["Manrope_500Medium"],
        semi:   ["Manrope_600SemiBold"],
        bold:   ["Manrope_700Bold"],
        extra:  ["Manrope_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
```

### 0.3 Load Manrope in `mobile/app/_layout.tsx`

Replace the existing `RootLayout` with:

```tsx
import "../global.css";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "@/lib/queryClient";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#f8fafc" }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### 0.4 Add a `components/ui/` folder with atoms

Create these files — they're reused across every screen. Every screen MUST use them; do not inline styled Views unless the component doesn't cover the case.

- `mobile/components/ui/Screen.tsx` — wraps SafeAreaView, sets bg-ink-50, provides optional `scroll` + `refreshControl` props.
- `mobile/components/ui/ScreenHeader.tsx` — `{ title, subtitle, rightSlot? }`. Renders as large title (32px Manrope ExtraBold, ink-900) with optional subtitle (15px ink-500) and optional right slot (for an avatar or + button). Padding: `px-6 pt-4 pb-4`.
- `mobile/components/ui/Card.tsx` — `bg-white rounded-2xl p-4 border border-ink-100`, shadow `{ shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }`. Accepts `onPress` for tappable variant.
- `mobile/components/ui/Pill.tsx` — `{ label, tone }` where `tone ∈ 'brand' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'`. Rounded-full, 10px Manrope Bold uppercase tracking-widest, color-matched bg/fg.
- `mobile/components/ui/IconButton.tsx` — 40×40 rounded-full, `tone ∈ 'brand' | 'neutral'`, takes a lucide icon child.
- `mobile/components/ui/PrimaryButton.tsx` — 52px tall, rounded-2xl, bg-brand-600, Manrope Bold 15px white. Pressed state: bg-brand-700. Disabled: bg-ink-200, ink-400 text.
- `mobile/components/ui/SecondaryButton.tsx` — same sizing, bg-white, border-ink-200, ink-900 text.
- `mobile/components/ui/EmptyState.tsx` — `{ icon, title, subtitle, cta? }` with lucide icon in a 64×64 rounded-3xl bg-brand-50 tile.
- `mobile/components/ui/StatusBadge.tsx` — maps quote/job/invoice statuses to the Pill component. Export a single map so badge colors are consistent everywhere.

### 0.5 Swap emoji icons for lucide-react-native

`lucide-react-native` is already installed. Standard icon mapping used across the app:

| Usage | Icon |
|---|---|
| Home tab | `LayoutDashboard` |
| Jobs tab | `Briefcase` |
| Quotes tab | `FileText` |
| Customers tab | `Users` |
| Invoices tab | `Receipt` |
| Add / New | `Plus` |
| Calendar banner | `CalendarDays` |
| Phone | `Phone` |
| Email | `Mail` |
| Location | `MapPin` |
| Time | `Clock` |
| Money | `DollarSign` |
| Search | `Search` |
| More / Menu | `MoreHorizontal` |
| Chevron right | `ChevronRight` |
| AI / Sparkle | `Sparkles` |
| Back | `ChevronLeft` |
| Close | `X` |
| Delete | `Trash2` |
| Error | `AlertTriangle` |

All icons 20px unless noted, `color` prop driven by theme, `strokeWidth={2}`.

**Commit**: `chore(mobile): foundation — brand theme, Manrope, ui atoms, lucide icons`

---

## Phase 1 — Tab bar redesign

**File:** `mobile/app/(tabs)/_layout.tsx`

Replace the emoji tab bar with a custom blurred floating bar. Do NOT add a Calendar or Profile tab yet — the existing 5 routes (`index`, `jobs`, `quotes`, `customers`, `invoices`) are all that exist. Profile is accessed from the home header avatar (Phase 2) and opens a Stack route we'll add in Phase 7.

Requirements:
- Use `Tabs` from expo-router with a custom `tabBar` render prop.
- Inside the custom tab bar: a `BlurView` (intensity 40, `tint="light"`) wrapped in an absolute-positioned `View` with `mx-4 mb-6 rounded-3xl overflow-hidden border border-ink-200/40`, shadow `{ shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 }`.
- Each tab: 56px tall, active shows the lucide icon in `brand-600` + a 4px dot below; inactive shows icon in `ink-400`. **No text labels** — icon-only.
- Haptic light impact on tab press (`Haptics.impactAsync(ImpactFeedbackStyle.Light)`).
- The screen content must pad `pb-28` to clear the floating bar.

**Commit**: `feat(mobile): floating blurred tab bar with lucide icons`

---

## Phase 2 — Home screen (`index.tsx`)

**File:** `mobile/app/(tabs)/index.tsx`. Keep `useJobs()` and `useAuth()` — do not change data flow. Rewrite the JSX only.

Match the `VGN-EC App.html` "Home" screen. Structure top to bottom:

1. **Header** — `ScreenHeader` with:
   - Title: `Hey, {firstName}` (no waving emoji — design uses a small waving-hand lucide icon `Hand` in brand-500 next to the name)
   - Subtitle: dynamic copy — if user has any pending jobs, `"{n} jobs waiting on you"`; else `"Ready to grow your business?"`
   - Right slot: circular avatar button (40px, bg-brand-100, brand-700 initial), tapping it opens `/(tabs)/profile` (Phase 7). For now, long-press triggers the existing `handleLogout` flow.

2. **Next Job hero card** — a prominent card at the top (only if `nextJob` exists). Design:
   - `Card` with `bg-brand-600` and white text
   - Tiny eyebrow label `NEXT UP · {nextJobDayLabel}` (brand-200, 10px uppercase, tracking-widest)
   - Big title `{nextJob.title}` (20px Manrope Bold, white)
   - Row of meta: `CalendarDays` icon + formatted time, `MapPin` icon + address (if present)
   - Right side: `ChevronRight` in a 36px rounded-full bg-white/10
   - Tapping routes to `/(tabs)/jobs`
   - If no `nextJob`: render a neutral card "No jobs scheduled — your week is clear" with a faint `Sparkles` icon, bg-white, ink-500 copy.

3. **Stats row** — two `Card`s side by side using the existing computed values `upcomingJobsCount` and pending count. Each card:
   - 44px value in Manrope ExtraBold, ink-900
   - Small eyebrow line above the number (`UPCOMING` / `PENDING`, 10px uppercase, ink-400)
   - Accent bar down the left edge (4px wide, brand-500 on upcoming, warning on pending)
   - Footer line: `"+2 this week"` placeholder is OK (no server field for deltas yet) — render the footer only if the real delta exists. **Do NOT invent numbers.** Hide the delta row if you can't source it.

4. **Quick Actions card** — `Card` with header `Quick Actions` (16px Manrope Bold). Three rows, each an `ActionRow`:
   - `Sparkles` brand → `Ask AI to draft a quote` → routes to `/ai-chat` (Phase 5 will build it; for now it can route to `/(tabs)/quotes`)
   - `FileText` brand → `View quotes` → `/(tabs)/quotes`
   - `Users` brand → `Manage customers` → `/(tabs)/customers`
   - Each row: 40px rounded-full brand-50 icon tile, title (14px semibold ink-900), subtitle (12px ink-400), `ChevronRight` in ink-300.

5. **This Week calendar strip** — reuse the existing `weekDays` + `selectedDate` + `getDayBadge` logic. Visual changes only:
   - Card header "This Week" + "View all" link (brand-600) on the right.
   - Day cells: unselected = transparent with ink-400 eeeday label and ink-900 date number; selected = bg-brand-600 rounded-xl with white text.
   - Badge dot: unselected uses `brand-500`/`warning`/`success`; selected uses white.
   - Below the strip: the selected-day jobs list uses `Card`-inside-`Card` pattern — each inner job row has a 40px bg-brand-50 rounded-xl tile with `Briefcase` icon, title, and time.
   - Empty state: ink-300 dashed border tile, `"No jobs on {dayLabel}"`.

6. **Bottom spacer**: `h-28` to clear the floating tab bar.

No hardcoded color values in the JSX — use Tailwind classes that map to the theme.

**Commit**: `feat(mobile): home — hero next-job, stats, quick actions, redesigned week strip`

---

## Phase 3 — Jobs screen

**File:** `mobile/app/(tabs)/jobs.tsx`. Keep `useJobs`, `useUpdateJob`, `STATUS_COLORS`, `STATUS_ACTIONS`, and the `handleStatusPress` logic. Rewrite the JSX.

Structure:
1. **Header** — `ScreenHeader` title `Jobs`, subtitle `{total} total · {upcoming} upcoming`, right slot is an `IconButton` with `Plus` that for now routes to `/(tabs)/jobs` (creation flow is out of scope this pass — TODO comment).

2. **Filter chips row** — horizontal `ScrollView` of pill-shaped filter chips. Options: `All`, `Scheduled`, `In progress`, `Pending`, `Completed`. Active chip: bg-brand-600 white. Inactive: bg-white border-ink-200 ink-600. Local state only — no persistence. The filter narrows the sorted list.

3. **Job cards** — each card uses `Card` and contains:
   - Row 1: Title (16px Manrope Bold, ink-900) · `StatusBadge` on the right.
   - Row 2: Customer name with `Users` icon (14px ink-500) — only if `customerName`.
   - Row 3: scheduled date+time with `CalendarDays` icon — only if `scheduledDate`.
   - Row 4: address with `MapPin` icon (ink-400, numberOfLines=1) — only if `address`.
   - Footer: "Update status →" button as an inline row (replaces the existing blue button). Only shown when `STATUS_ACTIONS` has entries. Tapping calls the existing `handleStatusPress`.
   - Entire card is pressable, navigates to `/jobs/[id]` (add a placeholder route in Phase 7; for now, just console.log the id).

4. Empty state → `EmptyState` with `Briefcase` icon, `"No jobs yet"`, `"Your schedule will appear here as jobs are created."`.

5. Loading → full-screen centered `ActivityIndicator` with brand-600 tint.

6. Error → `EmptyState` with `AlertTriangle`, `"Couldn't load jobs"`, `"Check your connection and try again."`.

7. Bottom spacer `h-28`.

**Commit**: `feat(mobile): jobs list — filter chips, rich job cards, lucide icons`

---

## Phase 4 — Quotes screen

**File:** `mobile/app/(tabs)/quotes.tsx`. Same rules: keep `useQuotes`, `useUpdateQuote`, `useDeleteQuote`, `NEXT_STATUSES`, `handleStatusPress`, `handleDeletePress`. Only the JSX is rebuilt.

Structure:
1. **Header** — title `Quotes`, subtitle `{total} · {sentCount} sent · {acceptedCount} accepted`, right slot = `Plus` `IconButton` (routes to `/ai-chat` to draft a new one — Phase 5 stub OK).

2. **Summary ribbon** — a single horizontal `Card` showing three inline stats separated by 1px ink-100 dividers: `Total value` (sum of `totalAmount` for non-declined), `Awaiting response` (count of `sent` + `viewed`), `Accepted this month`. Use derived values client-side; do not call a new endpoint.

3. **Filter chips** — `All`, `Draft`, `Sent`, `Accepted`, `Declined`, `Invoiced`. Active = brand-600.

4. **Quote cards** — each `Card` tappable:
   - Row 1: Title (derived `jobTitle` from existing JSON parse, or `Quote #{id}`) · `StatusBadge` pill on the right (keep the `canChangeStatus` tap behavior; add `ChevronRight` inside the pill when tappable).
   - Row 2: customer name with `Users` icon.
   - Row 3: Amount (20px Manrope Bold, ink-900) on the left; `"Sent {relative date}"` with `Clock` icon (ink-400, 12px) on the right.
   - Footer: if `canDelete`, small `Trash2` icon + "Delete" text row at the bottom; tapping calls `handleDeletePress`.
   - Card tap → route to `/quotes/[id]` (stub route — Phase 7).

5. Empty state: `EmptyState` with `FileText`, `"No quotes yet"`, CTA `SecondaryButton` labeled `"Ask AI to draft one"` that routes to `/ai-chat`.

6. Loading & error states mirror Jobs.

**Commit**: `feat(mobile): quotes list — summary ribbon, filter chips, rich quote cards`

---

## Phase 5 — AI Chat route (new)

**New file:** `mobile/app/ai-chat.tsx` (a Stack route, not a tab).

This is a modal-style conversational screen that drafts quotes. It is NOT wired to a real LLM endpoint — the server side does not exist yet. Build the UI only, with the following behavior:

- Local state machine: `idle → clarifying → drafting → draft_ready → confirmed`.
- Message list (FlatList, inverted=false, maintainVisibleContentPosition). Bubbles: AI = bg-white border-ink-100 rounded-2xl rounded-tl-sm, self-align-start; user = bg-brand-600 white rounded-2xl rounded-tr-sm, self-align-end. Padding `px-4 py-3`, max width 80%.
- Input bar at the bottom (sticky above keyboard via `KeyboardAvoidingView`): rounded-2xl bg-white border-ink-200, send button is a 44px bg-brand-600 rounded-full with `Send` lucide icon. Use `expo-haptics` light impact on send.
- Header: back chevron + title "AI assistant" + tiny `Sparkles` brand dot.
- Seed with 2 AI messages: an intro and a prompt "Describe the job — what, who for, and any known costs."
- On user send, run a canned 3-step scripted flow (use setTimeout 600–1200ms between steps) that:
  1. Asks one clarifying question.
  2. Shows a "thinking" indicator (3 pulsing dots in a bubble).
  3. Renders a **Draft quote card** inline inside a bubble — a `Card` inside the chat showing: customer, job title, 2–3 line items with qty × price, subtotal, GST, total. Below the card: two buttons `Edit` (secondary) and `Looks good — send` (primary).
- Tapping `Send`: shows a success toast from `@/lib/toast` ("Quote ready — opening editor") and `router.replace('/(tabs)/quotes')`. No real API call.
- Put a `// TODO: wire to /api/ai/chat once endpoint exists` comment at the top.

**Register the route** in `mobile/app/_layout.tsx` under the existing Stack by adding `<Stack.Screen name="ai-chat" options={{ presentation: "modal" }} />`.

**Commit**: `feat(mobile): ai-chat scripted prototype screen (no server wiring)`

---

## Phase 6 — Invoices + Customers polish

### Invoices (`mobile/app/(tabs)/invoices.tsx`)

Keep the existing `useQuery` call untouched. Rewrite JSX:

- Header: `Invoices`, subtitle `{total} · {paidTotal} paid this month`, right slot `Plus` `IconButton` (TODO).
- Summary ribbon card: `Outstanding` (sum of non-paid totalAmount), `Overdue` (count where status==='overdue'), `Paid this month` ($ sum).
- Filter chips: `All`, `Draft`, `Sent`, `Paid`, `Overdue`.
- Invoice card: invoice number · status pill · customer row · amount (20px bold) · due date with `Clock` icon (red ink-500 if overdue).
- Loading/error/empty = same pattern as Jobs.

### Customers (`mobile/app/(tabs)/customers.tsx`)

Keep `useCustomers`, `useCreateCustomer`, `useDeleteCustomer`, and the entire modal logic. Rewrite JSX:

- Header: `Customers`, subtitle `{total} total`, right slot `Plus` `IconButton` → opens the existing modal.
- Search input: `Search` lucide icon on the left inside a rounded-2xl bg-white border-ink-200 input. Placeholder "Search by name, email, or phone".
- Customer row: 48px rounded-full avatar with initial (bg-brand-100 brand-700), name (semibold ink-900) + email (ink-400 12px) + phone (ink-400 12px) stacked, `MoreHorizontal` menu icon on the right (long-press on row still triggers delete via `handleDeletePress`; tap for now does nothing — TODO customer detail).
- Empty state uses `EmptyState` + `Users` icon.
- **Modal redesign**: same fields, but labels use Manrope Bold 10px uppercase tracking-widest ink-500; inputs bg-ink-50 border-ink-200 rounded-2xl py-4 px-4 ink-900 15px. Header: `X` close icon on the left, title centered, `Save` text on the right in brand-600 (disabled while pending).

**Commit**: `feat(mobile): invoices + customers — summary ribbons, lucide icons, modal polish`

---

## Phase 7 — Profile + detail route stubs

Create these Stack routes so buttons that reference them don't crash. Each is a minimal screen — **no data fetching beyond existing hooks** — with a header and a placeholder card saying "Coming soon". They must compile and be reachable.

- `mobile/app/profile.tsx` — `Profile` screen. Reads from `useAuth()`. Shows: big avatar, name, email, "Settings", "Sign out" (calls existing `logout()`), version string from `expo-constants`.
- `mobile/app/jobs/[id].tsx` — `Job #{id}`. Reads `useJob(id)` from existing `use-jobs.ts`. Shows the job data in a scrollable layout. Stub out the timer section with a disabled `PrimaryButton "Start timer"`.
- `mobile/app/quotes/[id].tsx` — `Quote #{id}`. Stub: read quote from the `useQuotes()` list and find by id. Placeholder "Detail view coming next".

Register all three in the root `Stack`. Use `presentation: "card"` (default).

**Commit**: `feat(mobile): add profile + job detail + quote detail route stubs`

---

## Phase 8 — Verification checklist

Before opening the PR, verify:

- [ ] `cd mobile && npx tsc --noEmit` passes with zero errors
- [ ] `npx expo lint` passes
- [ ] App boots on iOS simulator (or `npx expo start --web` if no simulator handy)
- [ ] Tab bar is floating blurred orange-accented, icon-only
- [ ] Home shows: greeting header, next job hero (if any), stats row, quick actions, week strip
- [ ] Jobs, Quotes, Invoices all show filter chips and render at least the empty state cleanly
- [ ] Customers modal still creates a customer end-to-end (no regression)
- [ ] No hardcoded `#2563eb` remains anywhere in `mobile/app/**` or `mobile/components/**` (grep for it — should only appear in the git history, not the working tree)
- [ ] No emoji remain in JSX except inside user-generated text (customer names, job titles)
- [ ] Every screen has `pb-28` or equivalent to clear the floating tab bar

Open the PR with title `UI redesign: VGN-EC warm orange theme + rebuilt home/jobs/quotes/invoices/customers`. In the description include:
- Screenshots of each screen
- List of TODOs still outstanding (AI endpoint, job detail, quote detail, profile settings, job creation flow, calendar full view)
- Confirmation that schema, server, auth, and hooks are untouched

---

## Reference — exact repo facts the prompt relies on

- Expo 52 + expo-router 4 + NativeWind 4 + TanStack Query 5 — confirmed in `mobile/package.json`.
- `lucide-react-native` and `react-native-reanimated` already present.
- Hooks live in `mobile/hooks/` and use `apiRequest` from `@/lib/api` against routes in `@shared/routes`.
- Quote statuses: `draft | sent | viewed | accepted | declined | invoiced` (see `shared/schema.ts`).
- Job statuses: `scheduled | pending | in_progress | completed | cancelled`.
- Invoice statuses: `draft | sent | paid | overdue | void`.
- The `@shared/*` path alias is configured in `mobile/tsconfig.json`; do not introduce new aliases.
- The app currently imports `global.css` from `app/_layout.tsx` — keep this intact.
- `userSettings.quoteAccentColor` defaults to `#ea580c` already, which is the brand-600 token this prompt uses. Consistency is intentional.

If anything in this document conflicts with what you see in the repo, **stop and ask** rather than guess. The repo is the source of truth; this document is the design direction.
