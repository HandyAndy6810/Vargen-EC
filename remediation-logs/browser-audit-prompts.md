# Vargen Browser Audit Prompt Pack

Reusable prompts for Claude-in-Chrome to audit the Vargen app running as a web preview.
Paste the **Preamble** plus ONE round at a time. Bring the findings back to repo-side
Claude for triage + fixes, then re-verify before moving to the next round.

---

## PREAMBLE (paste before every round)

```
You are auditing "Vargen" — a quoting/invoicing app for Australian tradies (plumbers,
electricians, etc.) running as an Expo React Native web preview at http://localhost:8081.
The backend API runs at http://localhost:5000.

SCREEN MAP (routes you can visit):
- / (home dashboard with pipeline, weather, quick actions)
- /quotes (list with filters), /quotes/[id] (detail), /quotes/create (manual builder)
- /ai-chat (AI quote generator — describe job → draft with line items + margin slider)
- /jobs/list, /jobs/[id], /jobs/create, /jobs/complete
- /invoices/[id], /invoices/create (standalone or convert-from-quote)
- /calendar (week view with hour grid + outreach tab)
- /customers, /customers/[id], /customers/new, /customers/messages, /customers/compose
- /receipts, /receipts/scan
- /price-book
- /settings/* (edit-profile, business-details, invoice-settings, working-hours,
  service-area, ai-quoting, reminders, notifications, sms-templates, subscription,
  bank, payment-terms, widgets)
- /onboarding

SAFETY RULES — NON-NEGOTIABLE:
1. NEVER complete a real payment. If you reach any Stripe/Square/payment confirmation
   screen, STOP and note it — do not click pay/confirm.
2. Never send real SMS or email. If a flow opens a mail/SMS composer, close it.
   Use fake contact data only: emails like test@example.com, phones like 0400 000 000.
3. Prefix every record you create with "TEST-" (e.g. customer "TEST-Bob Smith",
   job "TEST-Hot water swap") so they can be purged later.
4. Keep the browser console open and include any errors/warnings you see in findings.

FEEDBACK FORMAT — report EVERY finding exactly like this, numbered sequentially:

BUG/ISSUE #N — [SEVERITY: CRITICAL | HIGH | MEDIUM | LOW]
Screen/route: (e.g. /quotes/create)
What I did: (exact steps to reproduce)
What happened: (actual behaviour, including any console errors verbatim)
What should happen: (expected behaviour)
Suggested fix: (your concrete suggestion — UI change, copy change, or likely code cause)

Severity guide:
- CRITICAL = crash, data loss, action silently fails, or user is blocked
- HIGH = core feature works wrong or produces wrong numbers
- MEDIUM = confusing UX, broken layout, dead-end navigation
- LOW = polish: copy, spacing, minor visual inconsistency

At the END of your report, add two short sections:
✅ WHAT WORKS WELL: (3–6 bullet points — things we must not regress)
🔍 SUGGESTED NEXT PROBES: (areas you couldn't fully test or want to dig into next round)
```

---

## ROUND A — Visual Design Audit

```
ROUND A — VISUAL DESIGN AUDIT (look, don't submit)

Walk through EVERY screen in the screen map. Do NOT submit forms or create data this
round — this is a visual/static pass. Log in first if needed.

On each screen, evaluate:
1. LAYOUT: misaligned elements, inconsistent padding/margins between similar screens,
   elements overflowing or clipped, horizontal scroll where there shouldn't be any
2. TYPOGRAPHY: heading hierarchy consistent across screens? Any text truncated with
   no way to read it? Font sizes that feel off?
3. COLOR & CONTRAST: text that's hard to read on its background, inconsistent use of
   the orange brand color, status colors (draft/sent/accepted/overdue) used consistently
   between quotes, jobs and invoices
4. TOUCH TARGETS: buttons/links that look too small to tap on a phone (<44px)
5. EMPTY STATES: visit screens with no data — is there a helpful empty state or just
   blank space?
6. LOADING STATES: throttle network in DevTools (Slow 4G) and reload key screens —
   do you see spinners/skeletons or layout jumps?
7. RESPONSIVE: resize the window to 375px wide (iPhone SE) and ~430px (iPhone Pro Max).
   Note anything that breaks, overlaps, or clips at either size.
8. CONSISTENCY: do cards, buttons, inputs and section headers look like the same
   design system on every screen, or do some screens feel like a different app?

Report every finding in the FEEDBACK FORMAT. Screenshot-worthy issues: describe the
visual problem precisely enough that a developer can find it without the screenshot.
```

---

## ROUND B — Functional Testing

```
ROUND B — FUNCTIONAL TESTING (create, edit, verify persistence)

Execute these flows in order, with TEST- prefixed data. After each create/edit,
RELOAD the page and confirm the data persisted. Watch the console throughout.

1. AUTH: log out, register a new account (TEST- email), log out, log back in
2. CUSTOMER: create "TEST-Bob Smith" with phone 0400 000 000 / test@example.com,
   edit him, view his detail page
3. MANUAL QUOTE: /quotes/create → fill all fields, add 3 line items via the modal,
   edit one, delete one, save draft → verify it appears in /quotes with the right
   customer name and total → open it → use "Tweak" to edit → save again
4. AI QUOTE: /ai-chat → describe "Replace hot water system, Rheem 315L" → generate
   → on the draft: edit a line item qty and rate, DRAG THE MARGIN SLIDER left and
   right (verify cost/price/profit numbers update and line items rescale), save
   draft → verify in /quotes with correct customer name and total
5. QUOTE STATUS: change a quote draft→sent→accepted via the status controls
6. CONVERT: accepted quote → Convert → create invoice → verify line items and
   totals carried over and quote shows "Invoiced"
7. STANDALONE INVOICE: /invoices/create directly — labour rate/hours + 2 line items
   → verify totals math (subtotal + 10% GST) is correct before and after save
8. JOB: /jobs/create → schedule "TEST-job" for tomorrow 9am, 2hr → verify it appears
   on /calendar in the right slot → open it → complete the job entering actual
   hours → check the "Profit check" reconciliation card renders
9. QUOTES FILTERS: from home, tap each pipeline chip (draft/sent/accepted/overdue)
   → verify /quotes opens pre-filtered correctly each time
10. SETTINGS: change labour rate and markup % in settings → start a new AI quote →
    verify the new rate prefills
11. DELETE: delete one TEST- quote and one TEST- customer — confirm confirmation
    dialogs appear and the records disappear

STOP RULES: do not press any final "Pay" button; do not actually send SMS/email.

Report every failure or oddity in the FEEDBACK FORMAT — including wrong math,
silent failures (button does nothing), and console errors.
```

---

## ROUND C — Workflow & Journey Testing

```
ROUND C — WORKFLOW & JOURNEY TESTING (think like a tradie on the go)

Run these realistic end-to-end journeys. You're hunting for friction: dead ends,
data you have to re-type, steps that don't flow into each other, missing
back-navigation, and journeys that take more taps than they should. Count taps.

JOURNEY 1 — "New lead while on a job": from the home screen, a customer calls —
create the customer AND get a quote to them as fast as possible. How many taps?
Where did you have to re-enter info that the app already knew?

JOURNEY 2 — "Quote to cash": take an existing TEST- quote through
sent → accepted → job scheduled → job completed (with actual hours) → invoice →
(stop before payment). Does each step lead naturally to the next, or do you have
to go hunting through tabs? Does data (customer, address, line items, amounts)
flow through automatically at every step?

JOURNEY 3 — "Where's my money?": as a tradie wondering what's owed — can you
quickly find: overdue quotes to chase, unpaid invoices, this week's booked work,
and what your real margin was on the last completed job? Note anything that took
more than ~3 taps to find.

JOURNEY 4 — "Fix a mistake": made a typo on a sent quote — edit it. Quoted the
wrong customer — can you change the customer? Scheduled a job at the wrong time —
reschedule it. Note anything that's impossible or destructive (forces delete+recreate).

JOURNEY 5 — "Interrupted flow": halfway through creating an AI quote, navigate
away (back button, then a tab) — are you warned about losing work? Come back —
is your work gone? Same test in the manual quote builder and invoice creator.

For each journey, report findings in the FEEDBACK FORMAT, plus a one-line verdict:
"JOURNEY N: smooth | bumpy | broken — [tap count] taps, [main friction point]"
```

---

## ROUND D — Ease of Use & Polish

```
ROUND D — EASE OF USE / FIRST-TIME-USER PASS

Pretend you've never seen this app and you're a 45-year-old plumber, not a tech
person. Walk the app with fresh eyes.

1. CLARITY: on each main screen, is it obvious within 2 seconds what the screen is
   for and what you should tap next? Flag any screen that needs explanation.
2. JARGON & COPY: any labels/copy that are developer-speak, ambiguous, or
   un-Australian for the trade context? Any buttons whose outcome you couldn't
   predict before tapping?
3. ERROR RECOVERY: trigger validation errors on every form (submit empty, bad
   email, letters in number fields, negative prices, qty 0, absurd values like
   $999999999). Are messages clear about WHAT to fix? Can you always recover
   without losing your other inputs?
4. FEEDBACK VISIBILITY: after every action (save, delete, status change) — is
   there clear confirmation it worked? Flag any action with no visible feedback
   on web.
5. DESTRUCTIVE ACTIONS: try to delete things — is every destructive action
   confirmed first? Is anything destructive NOT confirmed?
6. KEYBOARD & FOCUS: tab through forms — sensible focus order? Enter submits where
   expected? Do numeric fields show numeric keyboards (check input types)?
   Does focusing inputs near the bottom get hidden behind sticky buttons?
7. ACCESSIBILITY BASICS: zoom browser to 150% — does anything break? Any
   icon-only buttons with unclear meaning?
8. ONBOARDING: visit /onboarding — does it set up a new user for success? Does it
   explain the AI quoting (the app's hero feature)?

Report in the FEEDBACK FORMAT. End with your TOP 5 changes that would most improve
the experience for a non-technical tradie, ranked.
```

---

## Loop protocol (for the human driving this)

1. Paste **Preamble + Round A** into Claude-in-Chrome → collect findings
2. Paste findings into repo-side Claude → it triages, fixes, commits, pushes
3. Repo-side Claude returns a "re-verify" list + the next round's prompt (augmented
   with targeted probes based on what was just found)
4. Re-verify fixes in Claude-in-Chrome, then run the next round
5. After Round D, loop back to deeper edge-case rounds as needed
