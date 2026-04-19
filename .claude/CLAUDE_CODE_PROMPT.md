# Claude Code Handoff Prompt — VGN-EC Mobile App

Copy everything below into Claude Code (run `claude` in the repo root, then
paste). The handoff package should be unzipped somewhere Claude Code can read
it — e.g. `~/vgn-ec-handoff/` — and the prompt references that path.

---

## The prompt

> I'm handing you a design package for **Vargenezey ("VGN-EC")** — a mobile
> admin app for Australian solo tradies. The design bundle lives at
> `~/vgn-ec-handoff/` (update this path if different). The target codebase is
> the current repo: an Expo / React Native app under `mobile/` with Expo Router
> tabs already scaffolded at `mobile/app/(tabs)/` (index, quotes, jobs,
> invoices, customers).
>
> **Your task:** recreate the 19-screen prototype from the design bundle inside
> the existing `mobile/` app, using its existing Expo Router structure,
> NativeWind (Tailwind for RN), and any existing components under
> `mobile/lib/` and `mobile/hooks/`. Do **not** ship the HTML — it's a visual
> reference.
>
> ### Step 1 — read in this order
> 1. `~/vgn-ec-handoff/README.md` — full design spec: brand, colour tokens,
>    typography scale, every screen's layout, animations, state, file map.
> 2. `~/vgn-ec-handoff/VGN-EC App.html` — open in a browser. The left rail
>    navigates all 19 screens; the dark toggle flips theme; buttons inside the
>    phone frame cross-link. This is the source of truth for interaction + look.
> 3. `~/vgn-ec-handoff/lib/app-shell.jsx` — tokens (`VC`, `VCDark`), atoms
>    (`Eyebrow`, `Dot`, `StatusPill`, `PrimaryBtn`, `Card`), `Ico` icon set,
>    `FloatingNav` (the liquid-glass bottom bar — critical hero component).
> 4. Each `lib/screen-*.jsx` — one file per screen group. Lift the exact copy,
>    spacing, and layout from here.
>
> ### Step 2 — audit the existing codebase
> - `mobile/package.json` — what's already installed? Check for `expo-blur`,
>   `lucide-react-native`, `react-native-reanimated`, fonts setup.
> - `mobile/tailwind.config.js` and `mobile/global.css` — existing theme. Port
>   the VGN-EC tokens into the Tailwind theme as `colors.ink`, `colors.paper`,
>   `colors.orange`, etc. Keep light + dark.
> - `mobile/app/(tabs)/_layout.tsx` — existing tab structure. You'll need to
>   **replace** the default tab bar with the custom `FloatingNav` from the
>   design (5 tabs: Home · Quotes · Invoices · Calendar · Profile). Note: the
>   current repo has a `customers` tab but the design doesn't — keep it as a
>   sub-screen accessed from Profile or Jobs, not a top tab.
> - `mobile/lib/` and `mobile/hooks/` — use what exists, don't duplicate.
>
> ### Step 3 — build in this order (one PR / commit per phase, please)
> 1. **Tokens & fonts** — port `VC`/`VCDark` to Tailwind. Load Manrope via
>    `expo-font`. Verify dark mode works end-to-end.
> 2. **Atoms** — `Eyebrow`, `Dot`, `StatusPill`, `PrimaryBtn`, `GhostBtn`,
>    `Card`, `Ico` (wrap `lucide-react-native`). Match the prototype's sizes
>    and weights exactly.
> 3. **FloatingNav** — uses `expo-blur` `<BlurView intensity={60} tint="light">`
>    with overlay + inset strokes. This is the biggest visual differentiator;
>    spend time here. Reference: `FloatingNav` in `app-shell.jsx` for the exact
>    shadow/highlight recipe.
> 4. **Home (Mission Control)** — the dashboard. Up-next hero, stat strip, AI
>    CTA band, today's timeline, money-in-motion row.
> 5. **AI flow** (4 screens) — Prompt → Clarify → Draft → Confirm. This is the
>    signature feature. Chat bubbles, suggestion pills, typing dots, quote
>    paper preview, delivery-option radios.
> 6. **Jobs** (4 screens) — list, detail, **timer** (ambient black with pulsing
>    halo, 72pt tabular-nums clock, needs Reanimated), completion (spring-scale
>    check mark).
> 7. **Quotes** (3 screens) — list, detail, create (AI/form toggle).
> 8. **Invoices** (3 screens) — list, detail, create-from-job.
> 9. **Calendar** — week strip + hour grid with live "now" line.
> 10. **Profile** — settings groups.
>
> ### Non-negotiables
> - Keep the brand voice. Copy strings like *"G'day Andy"*, *"Your rounds"*,
>   *"$ getting paid"*, *"Admin for people who'd rather be on the tools"*, and
>   *"Nothing surprising"* are intentional. Do not rewrite them.
> - Orange `#f26a2a` is the **only** brand accent. Do not introduce secondary
>   brand colours. Blue/green/red are status-only.
> - Hit targets ≥ 44pt. This is used on-site in gloves.
> - All amounts are AUD with **inc GST** shown on totals. Dates are AU format
>   (Tue 21 Apr).
> - Orange drop-shadow glow on primary CTAs — subtle but present
>   (`0 10px 24px rgba(242,106,42,0.4)`).
> - Icons are stroked (not filled), 2.1 stroke-width, rounded caps. Use Lucide.
>
> ### State & data
> For this first pass, **hard-code the demo data** you see in the prototype
> (Jack Dalton · 42 Harbour St Rozelle · Q-2048 · INV-248). Wire real data
> later. What must work end-to-end:
> - Tab nav + stack nav between all 19 screens.
> - Dark/light toggle persisted via `AsyncStorage`.
> - Job timer runs in real time (increments every second, survives
>   backgrounding via stored start-timestamp).
>
> ### Deliverables
> - Running `npx expo start` → I can navigate every screen and the nav bar
>   feels like liquid glass.
> - Short `IMPLEMENTATION_NOTES.md` at repo root listing: what's wired up,
>   what's mocked, what's deferred, any deviations from the design bundle and
>   why.
>
> Ask me before making any deviation from the spec that affects layout, copy,
> or colour. Start with Step 1 — read the README and acknowledge what you've
> understood before writing any code.

---

## Quick-reference checklist for the developer

- [ ] Manrope loaded via `expo-font`
- [ ] Tailwind theme has `ink`, `paper`, `paperDeep`, `card`, `cream`,
      `orange`, `orangeDeep`, `orangeSoft`, `blue*`, `green*`, `red*`
- [ ] Dark-mode variants working
- [ ] `FloatingNav` with blur + inset strokes
- [ ] All 19 screens reachable
- [ ] Timer uses `useSharedValue` + `useAnimatedStyle` (Reanimated)
- [ ] Haptics on primary CTAs
- [ ] AU date formatting helper
- [ ] `IMPLEMENTATION_NOTES.md` committed
