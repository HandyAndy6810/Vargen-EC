# Vargen Browser Audit Prompt Pack — v2

14 focused rounds. Each one covers 2–4 screens or 1–2 flows.
Paste **Preamble + ONE round** at a time. Copy the output before starting the next round.
Bring findings back to repo-side Claude for triage + fixes after each round.

---

## PREAMBLE (paste before every round)

```
You are auditing "Vargen" — a quoting/invoicing app for Australian tradies.
It runs as a web preview at http://localhost:8081 (API at http://localhost:5000).
Keep the browser console open throughout.

SAFETY RULES — non-negotiable:
1. NEVER complete a real payment — stop at any payment confirmation screen.
2. Never send real SMS or email — close any composer that opens.
3. Prefix all test records with "TEST-" so they can be purged later.
4. Use fake data only: test@example.com, 0400 000 000.

FEEDBACK FORMAT — use this for every finding:

BUG/ISSUE #N — [CRITICAL | HIGH | MEDIUM | LOW]
Screen/route:
What I did:
What happened: (include any console errors verbatim)
What should happen:
Suggested fix:

Severity:
- CRITICAL = crash, data loss, silent failure, user blocked
- HIGH = feature works wrong or produces wrong numbers
- MEDIUM = confusing UX, broken layout, dead-end navigation
- LOW = polish: copy, spacing, minor visual issue

End your report with:
✅ WHAT WORKS WELL: (2–4 bullets)
```

---

## Round 1 of 14 — Home screen

```
ROUND 1 OF 14 — HOME SCREEN VISUAL + QUICK ACTIONS

Visit: / (home dashboard)

Check:
1. Pipeline stats row — do the numbers (draft/sent/accepted/overdue counts) look
   correct and readable at 375px wide? Any clipping or overlap?
2. Weather widget — does it load, or does it show an error/empty state?
3. Quick-action buttons — are all 4 visible and tappable at 375px?
4. "Last N quotes" section — does it show the right number in the heading?
   Does it show at all if there are 0 recent quotes?
5. Footer at the very bottom — what does it say exactly?
6. Dark mode: toggle dark mode in Profile → Appearance, come back to home.
   Any text that becomes unreadable or elements that disappear?

Report in the FEEDBACK FORMAT. Short findings only — no need to explore other screens.
```

---

## Round 2 of 14 — Quotes screens

```
ROUND 2 OF 14 — QUOTES SCREENS VISUAL

Visit: /quotes (list), /quotes/create (manual builder), and one quote detail /quotes/[id]

Check:
1. /quotes list: do status chips (Draft/Sent/Accepted/Overdue) filter the list correctly?
   Is there a helpful empty state if a filter has no results?
2. /quotes/create: do all fields have visible labels? Is the line-item modal easy to
   find and open? Do the total/subtotal/GST numbers update live as you type?
3. Quote detail: are the line items, totals, and status badge all clearly laid out?
   Is there an obvious way to change the status from this screen?
4. At 375px width: does anything in the quote builder overflow or get cut off?
5. Console: any errors on any of these three screens?

Report in the FEEDBACK FORMAT.
```

---

## Round 3 of 14 — Jobs + Calendar screens

```
ROUND 3 OF 14 — JOBS + CALENDAR SCREENS VISUAL

Visit: /jobs/list, /jobs/create, /calendar

Check:
1. /jobs/list: is there a clear empty state if no jobs exist? Is the list scannable
   (customer name, date, status all visible at a glance)?
2. /jobs/create: do the date picker, start-time and end-time dropdowns work? What is
   the earliest and latest time available in the time picker?
3. /calendar: does it open on the CURRENT week (not a past week)? Is today
   highlighted? Does the hour grid show jobs in the correct time slots?
4. Calendar "Outreach" tab — what is on it? Does it load or error?
5. At 375px: does the calendar grid clip or scroll correctly?
6. Console errors on any of these screens?

Report in the FEEDBACK FORMAT.
```

---

## Round 4 of 14 — Customers + Invoices screens

```
ROUND 4 OF 14 — CUSTOMERS + INVOICES SCREENS VISUAL

Visit: /customers (list), /customers/new, /customers/[id] (a detail page), /invoices/create

Check:
1. /customers list: empty state — is there a CTA to add the first customer?
2. /customers/new: all fields visible and labelled? Any required fields that aren't obvious?
3. Customer detail: are the tabs/sections (info, quotes, jobs, invoices) all navigable?
   Is there an obvious way to compose a message to the customer?
4. /invoices/create: do labour hours × rate calculate correctly on screen before saving?
   Does the GST (10%) show correctly? Can you add line items?
5. At 375px: anything clipped on the customer detail or invoice creator?
6. Console errors?

Report in the FEEDBACK FORMAT.
```

---

## Round 5 of 14 — Settings screens visual

```
ROUND 5 OF 14 — SETTINGS SCREENS VISUAL

Visit each settings screen via Profile tab:
Business details · Invoice & quote settings · Working hours · Service area ·
AI quoting · Price book · Reminders · Appearance · Notifications · Subscription

Check (quickly — don't change anything yet):
1. Does each screen have a back button that works?
2. Any screen that looks visually broken, clipped, or unfinished?
3. Reminders screen: if you toggle "Automatic follow-ups" ON, does the interval
   config appear immediately without a reload?
4. Subscription screen: does the plan card show readable text in both light and dark mode?
5. Appearance modal: does switching Light/Dark/System take effect immediately?
6. Console errors on any settings screen?

Report in the FEEDBACK FORMAT. Note the screen name for each finding.
```

---

## Round 6 of 14 — Auth + Customer CRUD

```
ROUND 6 OF 14 — AUTH + CUSTOMER CRUD FUNCTIONAL TEST

Execute in order. Reload the page after each save to confirm persistence.

1. Sign out (Profile → Sign out). Confirm the dialog appears and you land on login.
2. Register a NEW account with email test-new@example.com and any password.
   Does it succeed? Can you log in with those credentials?
3. Log back in as your MAIN account.
4. Create customer "TEST-Bob Smith", phone 0400 000 000, email test@example.com.
   Save → reload → confirm all fields persisted.
5. Edit TEST-Bob Smith — change the phone number. Save → reload → confirm change saved.
6. View TEST-Bob Smith's detail page. Is the updated phone showing?
7. Delete TEST-Bob Smith. Does a confirmation dialog appear? Does he disappear from the list?

Report every failure or oddity in the FEEDBACK FORMAT.
```

---

## Round 7 of 14 — Manual quote builder

```
ROUND 7 OF 14 — MANUAL QUOTE BUILDER FUNCTIONAL TEST

1. Go to /quotes/create.
2. Select customer "TEST-Bob Smith" (create him first if he was deleted last round).
3. Set a title, date, and expiry.
4. Open the line-item modal — add 3 items (Labour 2hr @ $120, Materials $80, Call-out $60).
5. Edit the second line item — change the rate.
6. Delete the third line item.
7. Confirm the subtotal, GST (10%), and total are mathematically correct on screen.
8. Save as draft → verify it appears in /quotes with the right customer name and total.
9. Open the saved quote → use "Tweak" (or Edit) to change the title → save → reload →
   confirm the change persisted.
10. Console errors throughout?

Report in the FEEDBACK FORMAT including the actual vs expected totals if math is wrong.
```

---

## Round 8 of 14 — AI quote + margin slider

```
ROUND 8 OF 14 — AI QUOTE FUNCTIONAL TEST

1. Go to /ai-chat.
2. Describe: "Replace hot water system, Rheem 315L, labour 3 hours" — assign to
   TEST-Bob Smith if there's a customer selector, otherwise note there isn't one.
3. Hit generate. How long does it take? Does a loading state show?
4. On the generated draft:
   a. Are line items listed with qty, rate, and total?
   b. DRAG the margin slider all the way left then all the way right — do the
      cost/price/profit numbers update in real time? Do the line item prices rescale?
   c. Edit one line item's qty manually — does the total update?
5. Save the draft → check it appears in /quotes with the right total.
6. Console errors (especially during generation)?

Report in the FEEDBACK FORMAT. Note the exact slider behaviour (smooth, jumpy, broken).
```

---

## Round 9 of 14 — Quote status + invoice conversion

```
ROUND 9 OF 14 — QUOTE STATUS CHANGES + INVOICE CONVERSION

Use one of the TEST- quotes created in rounds 7 or 8.

1. Open the quote → change status Draft → Sent. Does the badge update immediately?
   Reload — does Sent persist?
2. Change status Sent → Accepted. Same checks.
3. From the Accepted quote, find and tap "Convert to Invoice" (or equivalent).
4. On the invoice creation screen: are all line items carried over? Is the total correct?
5. Save the invoice → does the original quote now show "Invoiced" status?
6. Open the new invoice — are the customer, line items, and totals all correct?
7. Console errors?

Report in the FEEDBACK FORMAT. Note exactly what copy the convert button uses.
```

---

## Round 10 of 14 — Standalone invoice math + job scheduling

```
ROUND 10 OF 14 — STANDALONE INVOICE + JOB SCHEDULING

PART A — Standalone invoice:
1. Go to /invoices/create (direct, not from a quote).
2. Add: Labour 4hrs @ $110/hr + one line item "TEST-Materials" $250.
3. Confirm on-screen: subtotal should be $690, GST $69, total $759.
4. Save → reload → confirm numbers persisted correctly.

PART B — Job scheduling:
1. Go to /jobs/create.
2. Create "TEST-Hot water swap", assign TEST-Bob Smith, schedule for tomorrow 9am, 2hr duration.
3. Save → go to /calendar → confirm the job appears in the correct time slot tomorrow.
4. Open the job → tap Complete → enter actual hours (3hrs) and any notes → save.
5. Does a "Profit check" or reconciliation card appear after completing?
6. Console errors?

Report in the FEEDBACK FORMAT.
```

---

## Round 11 of 14 — Journey: New lead + Quote to cash

```
ROUND 11 OF 14 — JOURNEYS: NEW LEAD AND QUOTE TO CASH

JOURNEY 1 — "New lead while on a job" (count every tap):
Starting from the home screen, a customer just called. Goal: create the customer AND
get a quote drafted as fast as possible.
- Note every screen you visit and every tap.
- Did you have to re-enter anything the app already knew (e.g. customer name on the quote)?
- Verdict: smooth | bumpy | broken — [tap count] taps, [main friction point]

JOURNEY 2 — "Quote to cash" (use existing TEST- records):
Take a saved draft quote through: sent → accepted → schedule job → complete job
(enter actual hours) → convert to invoice → (stop before payment).
- Does each step naturally prompt the next, or do you have to go hunting through tabs?
- Does customer/address/line item data carry through automatically at every step?
- Verdict: smooth | bumpy | broken — [tap count] taps, [main friction point]

Report each friction point in the FEEDBACK FORMAT.
```

---

## Round 12 of 14 — Journey: Finding money + Fixing mistakes

```
ROUND 12 OF 14 — JOURNEYS: FINDING MONEY AND FIXING MISTAKES

JOURNEY 3 — "Where's my money?" (goal: ≤3 taps to each answer):
Can you quickly find:
a. Overdue quotes to chase?
b. Unpaid invoices?
c. This week's scheduled jobs?
d. The real margin on the last completed job?
Note how many taps each took and where you got stuck.
- Verdict: smooth | bumpy | broken

JOURNEY 4 — "Fix a mistake":
a. Open a sent quote → fix a typo in the title → save. Did it work without
   changing status or losing data?
b. Can you change the customer on a quote? Or is it locked after creation?
c. Open a scheduled job → change the time to 11am. Did the calendar update?
d. Note anything that forced you to delete and re-create instead of edit.
- Verdict: smooth | bumpy | broken

Report each friction point in the FEEDBACK FORMAT.
```

---

## Round 13 of 14 — Interrupted flows + Receipts + Price book

```
ROUND 13 OF 14 — INTERRUPTED FLOWS + RECEIPTS + PRICE BOOK

PART A — Interrupted flows:
1. Start creating an AI quote (/ai-chat), type a description, then hit the back button.
   Are you warned about losing work? Is your text gone when you return?
2. Start a manual quote (/quotes/create), fill in 2 fields, then tap a bottom-nav tab.
   Same questions.
3. Start creating an invoice, fill fields, navigate away — same questions.

PART B — Receipts:
1. Visit /receipts — what's here? Empty state or existing data?
2. Try /receipts/scan — does the camera/upload UI appear or does it error?

PART C — Price book:
1. Visit /price-book — can you add a TEST- item with a name, cost, and price?
2. Save it → reload → did it persist?
3. Start a new AI quote — does the AI appear to use your price book items?

Report in the FEEDBACK FORMAT.
```

---

## Round 14 of 14 — Ease of use + Polish

```
ROUND 14 OF 14 — EASE OF USE / FIRST-TIME TRADIE PASS

Imagine you're a 50-year-old plumber, not a tech person. Fresh eyes.

1. CLARITY: pick the 3 screens that felt most confusing — what was unclear within
   the first 2 seconds?
2. JARGON: any labels that are too technical or un-Australian for a tradie?
   (e.g. "invoice" vs "bill", anything that sounds like accounting software)
3. ERRORS: on /quotes/create, try submitting with no customer selected and no title.
   Are the error messages clear about WHAT to fix?
4. FEEDBACK: after saving a quote, a job, and an invoice — was there clear on-screen
   confirmation each time? (toast, alert, screen change)
5. DESTRUCTIVE ACTIONS: try to delete a quote, a job, and a customer. Is every
   delete confirmed first? Any delete with NO confirmation?
6. ZOOM: set browser zoom to 150% — does anything break or overlap?
7. TOP 5: list the top 5 changes (ranked) that would most improve this app for a
   non-technical tradie.

Report in the FEEDBACK FORMAT, plus the ranked TOP 5 at the end.
```

---

## Loop protocol

1. Paste **Preamble + Round N** into Claude-in-Chrome
2. **Copy the output immediately** before starting the next round
3. Paste findings here → repo-side Claude triages, fixes, commits, pushes
4. Move to Round N+1
