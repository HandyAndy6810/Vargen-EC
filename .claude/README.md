# Handoff: Vargenezey (VGN-EC) — Mobile Trades App

## Overview

Vargenezey ("VGN-EC") is a mobile admin app for Australian solo tradies —
electricians, plumbers, sparkies. The headline feature: **"quote a job with a
single sentence"** via AI. Secondary purpose: a calm, opinionated home screen
that answers *"what's next?"* while the tradie is on-site.

This package contains a 19-screen interactive prototype covering the full day:
Home → AI quote flow → Quotes → Jobs → Invoices → Calendar → Profile.

---

## About the design files

The files in this bundle are **design references created in HTML** — prototypes
showing intended look, layout, copy, and behaviour. They are not production code
to copy verbatim. The task is to **recreate these designs in the target
codebase's environment** (React Native / Expo is strongly recommended given the
mobile-first, native feel of the designs) using its established patterns,
component library, and styling system.

If no codebase exists yet, use **Expo + React Native** as the default — all
interactions were designed against iOS Dynamic Island device chrome, 44pt hit
targets, and liquid-glass blur that maps naturally to native primitives.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, shadows, and
micro-interactions are in place. Recreate pixel-perfectly in the target
framework, substituting the codebase's idiomatic primitives (e.g. `View`,
`Pressable`, `BlurView`) for the HTML/React equivalents used in the prototype.

---

## Design system

### Brand
- **Name:** Vargenezey (pronounced *var-GEN-a-zee*). Short form: **VGN-EC**.
- **Tagline:** *"Admin for people who'd rather be on the tools."*
- **Tone:** Dry, Australian, confident. No corporate SaaS speak. Use
  contractions. Examples of in-app copy to preserve: *"G'day Andy"*, *"Your
  rounds"*, *"$ getting paid"*, *"Nothing surprising."*

### Colour tokens
Source of truth: `lib/app-shell.jsx` → `VC` (light) and `VCDark` (dark).

**Light mode**
| Token        | Hex / value                   | Usage                                     |
|--------------|-------------------------------|-------------------------------------------|
| `ink`        | `#141310`                     | Primary text                              |
| `paper`      | `#f7f4ee`                     | App background                            |
| `paperDeep`  | `#efe9dd`                     | Subtle surface, chips                     |
| `card`       | `#ffffff`                     | Cards, sheets                             |
| `cream`      | `#fff8ef`                     | Warm hero cards                           |
| `black`      | `#0f0e0b`                     | Dark hero cards (not pure black)          |
| `orange`     | `#f26a2a`                     | **Primary / safety orange** — the brand   |
| `orangeDeep` | `#d94d0e`                     | Gradient deep, pressed state              |
| `orangeSoft` | `#ffe6d3`                     | Orange tinted bg                          |
| `blue`       | `#1f6feb`                     | "Sent/viewed" status                      |
| `blueSoft`   | `#eaf2ff`                     | Sent/viewed bg                            |
| `green`      | `#2a9d4c`                     | Paid / accepted / complete                |
| `greenSoft`  | `#e5f6eb`                     | Paid bg                                   |
| `red`        | `#d23b3b`                     | Destructive                               |
| `muted`      | `rgba(20,19,16,0.55)`         | Secondary text                            |
| `mutedHi`    | `rgba(20,19,16,0.72)`         | Tertiary text / body                      |
| `lineSoft`   | `rgba(20,19,16,0.08)`         | Hairline borders                          |
| `lineMid`    | `rgba(20,19,16,0.14)`         | Button borders                            |

**Dark mode** — see `VCDark` in `lib/app-shell.jsx`. Orange brightens to
`#ff7a3c`; paper becomes `#17150f`; cards `#221e17`.

### Typography
- **Family:** Manrope (weights 400, 500, 600, 700, 800) — Google Fonts.
  Fallback stack: `-apple-system, system-ui, sans-serif`.
- **Scale (mobile, 402pt-wide device frame):**
  | Role              | Size | Weight | Letter-spacing |
  |-------------------|------|--------|----------------|
  | Hero numeric      | 42–72 | 800   | −1.4 to −3     |
  | Display           | 30   | 800    | −1             |
  | Screen title      | 22   | 800    | −0.5           |
  | Card title        | 18   | 800    | −0.4           |
  | Item title        | 14   | 800    | −0.2 to −0.3   |
  | Body              | 13   | 600–700 | 0             |
  | Meta              | 11   | 600–700 | 0             |
  | Eyebrow / caps    | 10   | 800    | **2** (uppercase) |
  | Micro             | 9    | 800    | 1–1.4 (uppercase) |

### Spacing / radius / shadow
- **Screen padding:** 20px horizontal, 56px top (safe area), 100–120px bottom
  (for floating nav).
- **Radii:** 10 (chip) · 12 (button sq) · 14 (input) · 16 (button pill) · 18
  (card) · 22 (hero) · 24 (large hero) · 999 (pill).
- **Shadows:**
  - Card: `0 2px 8px rgba(0,0,0,0.03)`
  - Floating nav: `0 18px 40px rgba(20,19,16,0.18)` + insets (see glass recipe
    below)
  - Orange CTA: `0 10px 24px rgba(242,106,42,0.4)`
  - Dark hero: `0 18px 40px rgba(0,0,0,0.22)`

### Liquid-glass bottom nav
Pinned 22pt from bottom, ~340pt wide, 30pt radius. Uses `backdrop-filter:
blur(28px) saturate(220%)` with layered inset highlights to imitate iOS Liquid
Glass. Active item has white sub-pill with orange icon + label. Exact recipe in
`lib/app-shell.jsx` → `FloatingNav`. In React Native, use
`expo-blur`'s `<BlurView intensity={60} tint="light">` plus a white overlay at
0.4 opacity and an inset stroke.

### Icon set
Custom stroke icons (2.1 stroke-width, rounded caps) in
`lib/app-shell.jsx` → `Ico`. 30+ glyphs: home, quote, invoice, calendar,
profile, sparkle, pin, phone, msg, check, play, pause, camera, bell, edit,
eye, sun, grid, etc. In a real codebase, swap for **Lucide** or **Phosphor**
(duotone off) — they match the visual weight 1:1.

### Status pill tones
`draft | sent | viewed | accepted | paid | overdue | urgent | active | muted`.
Each is a tinted bg + coloured text + matching 1px border, uppercase 10px/800
at 1.2 letter-spacing. See `StatusPill` in `app-shell.jsx`.

---

## Screens / views

All screens live inside a **402×874** iPhone 15 Pro device frame with Dynamic
Island. Safe area = 56pt top, 34pt home indicator bottom.

### 1. Home — Mission Control (`home`)
**Purpose:** first-glance answer to *"what's next?"* when Andy opens the app
between jobs.

**Layout (top → bottom):**
1. Greeting row: "G'day Andy" + date + weather chip + avatar.
2. **Up-next hero card** — dark, full-bleed, orange radial glow. Shows the
   next job: time, title, customer, address, ETA, pulse-live dot. Primary CTA:
   "Navigate there" (orange pill).
3. **Stat strip** — 3 cells: Today's jobs · This week's $ · Overdue count.
4. **AI CTA band** — orange gradient pill: "Draft a quote with one sentence →"
   opens AI flow.
5. **Timeline** — today's 3 jobs as a vertical rail with time gutter, status
   dots, and cards.
6. **Money in motion** — 3 mini cards: Pipeline · Awaiting · Overdue.
7. **Floating glass nav** at bottom.

### 2–5. AI chat flow (`ai-entry`, `ai-clarify`, `ai-draft`, `ai-confirm`)
The signature feature. 4 sequential screens:

1. **Prompt** — big AI sparkle, *"What did you quote today?"*, 3 suggestion
   pills, composer with mic + photo + send.
2. **Clarify** — chat thread with AI asking for: model, callout fee (chips),
   schedule (pre-slotted with "Lock it in" / "Pick another"). Typing indicator.
   Bottom sticky **"Draft ready"** orange pill → draft.
3. **Draft** — quote paper preview (Q-2048, customer, 4 line items, subtotal,
   GST, total $2,004, orange) + AI reassurance strip *"Pricing matched to your
   last 3 similar jobs. Nothing surprising."*. CTAs: Tweak · Looks right.
4. **Confirm & send** — dark hero with $2,004, 3 delivery options (SMS/email/
   PDF) as radio rows, SMS preview, primary CTA "Send quote to Jack".

### 6–8. Quotes (`quotes-list`, `quotes-detail`, `quotes-create`)
- **List:** outstanding-pipeline hero card (black/orange), search, filter
  chips (All/Draft/Sent/Accepted/Overdue), vertically stacked quote cards.
- **Detail:** Q-2048 with status hero, progress rail (Drafted→Sent→Viewed→
  Accepted), customer row, line items table, history timeline. Bottom CTA
  "Convert to invoice".
- **Create:** mode toggle **Use AI / Form**. AI path loops to ai-entry. Form
  path has Customer / Job title / Date / Notes fields + line items.

### 9–12. Jobs (`jobs-list`, `jobs-detail`, `jobs-timer`, `jobs-complete`)
- **List:** "Today / Upcoming / Past / All" tabs, big count hero, job cards
  with time gutter. The "up next" card is black with orange glow.
- **Detail:** map placeholder (SVG road + pin), schedule card, customer,
  notes ("Back gate code 4821#"), parts & photos grid. CTAs: Navigate · Start
  job.
- **Timer:** **ambient black screen** with pulsing orange halo, 72pt
  tabular-nums elapsed clock, progress bar, 3 round controls (pause/camera/
  plus). Scrollable 5-item checklist below. Primary CTA "Mark complete".
- **Complete:** big green check (spring-scale in), summary table (duration,
  quote total, actuals, photos), AI nudge card "Generate invoice from this
  job". CTAs: Finish · Make invoice.

### 13–15. Invoices (`invoices-list`, `invoices-detail`, `invoices-create`)
- **List:** orange gradient hero "$4,840 outstanding · 8 invoices", AI nudge
  button, filter chips, invoice rows (paid = green amount, overdue = orange).
- **Detail:** black hero with amount due, due date, View PDF / Send reminder
  buttons, status row, charges table, payment methods offered.
- **Create:** "Pre-filled from job J-91" AI card, details form, charges
  table, total band (dark with orange total). CTAs: Save draft · Send invoice.

### 16. Calendar (`calendar`)
Week strip (7 day pills with dot-count for jobs), day headline ("Tuesday
21 Apr · 3 jobs"), vertical hour grid 7:00–19:00 with 54pt/hour, dashed hour
lines with 10pt labels, **live orange "now" line at 10:30**, positioned event
cards (black for up-next, blue for quote visits, white for normal).

### 17. Profile (`profile`)
Hero with avatar + "Andy Hollister · Vargenezey Electrical · ABN 52 889 221
143" + Pro plan badge. 3 stat cells (Jobs / Revenue / On-time). Four settings
groups: Business · AI & automations · Preferences · Account (each is a rounded
card with stacked rows, icon + label + subtext + chevron).

---

## Interactions & behaviour

- **Nav:** 5-tab floating glass bottom nav persists on every screen. Active
  item is orange. Cross-links inside content (e.g. "Convert to invoice" →
  invoice-create) drive the global `__vgnNav` setter in the prototype; in the
  real app, use the stack navigator.
- **Animations (marked `[anim: ...]` in source):**
  - Job-complete check: `scale 0 → 1.1 → 1` spring, 400ms.
  - Timer halo: `scale 1 → 1.05` infinite, 3s ease-in-out.
  - Typing dots: staggered 0.2s pulse.
  - Number counters (outstanding $): count-up 600ms on mount.
- **Haptics:** Medium impact on primary CTAs (send quote, start job, mark
  complete). Selection feedback on chip taps.
- **Transitions:** Screen-to-screen uses standard iOS push; AI flow steps
  slide with a subtle parallax on the sparkle mark.
- **Dark mode:** system-follow by default, manual toggle in Profile →
  Preferences. Current prototype persists to `localStorage`.

---

## State management

- **Nav state:** active screen id (stack or router).
- **Theme:** light | dark (user override + system).
- **AI session:** prompt string, clarifying Q/A pairs, drafted quote id,
  chosen delivery method.
- **Lists:** quotes, jobs, invoices — fetched; filter tab; search string.
- **Timer:** running job id + start timestamp (persist so backgrounding is
  safe).

---

## Assets

- **Fonts:** Manrope (Google Fonts).
- **Icons:** custom inline SVG today → swap for Lucide or Phosphor.
- **Imagery:** none used in prototype. Map is an SVG placeholder; in prod use
  MapKit (iOS) / Google Maps (Android). Photo tiles are camera-icon
  placeholders.
- **Logo:** "V" monogram on orange square — placeholder; real logo TBD.

---

## Files in this bundle

```
VGN-EC App.html               ← master prototype, 19 screens + left rail nav
Home Hi-Fi.html               ← standalone home exploration
Home Wireframes.html          ← 3 lo-fi home directions (A/B/C) explored earlier
lib/
  app-shell.jsx               ← tokens, atoms, FloatingNav, Screen, Card, etc.
  ios-frame.jsx               ← device bezel
  mission-control.jsx         ← home screen
  screen-ai-chat.jsx          ← 4 AI flow screens
  screen-quotes.jsx           ← list / detail / create
  screen-jobs.jsx             ← list / detail / timer / complete
  screen-invoices.jsx         ← list / detail / create
  screen-calendar.jsx         ← week calendar
  screen-profile.jsx          ← profile / settings
```

Open `VGN-EC App.html` in a browser — the left rail lets you jump to every
screen; the dark toggle flips theme. Tap buttons inside the device frame; many
cross-link.

---

## Recommended implementation path

1. Bootstrap Expo + TypeScript + `@shopify/restyle` (or tamagui) for theming.
2. Port `VC` / `VCDark` colour tokens 1:1 into the theme.
3. Load Manrope via `expo-font`.
4. Build atoms (`Eyebrow`, `Dot`, `StatusPill`, `PrimaryBtn`, `GhostBtn`,
   `Card`) and `Ico` (Lucide wrapper) first.
5. Build the **FloatingNav** with `expo-blur` — biggest visual
   differentiator, get it right before screens.
6. Screens in order: Home → AI flow → Jobs (timer is the other hero moment)
   → Quotes → Invoices → Calendar → Profile.
7. Wire navigation with `@react-navigation/native-stack` + a bottom tab root.
