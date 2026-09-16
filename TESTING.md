# Vargen EZ — feature checklist

The point of this file is that **"does everything work?" has an answer**, written
down, instead of being a feeling. Every feature the app ships is listed here with
what it is supposed to do. Walk it on a real build, mark each line, and record the
date and build at the top of the run.

Rules that keep this honest:

- **Test on a build, not Expo Go**, and log in with a real account. The preview
  build caches your user and never re-checks with the server, so log OUT and back
  IN first — otherwise a dead session looks like broken features.
- **A line is PASS only if it does the right thing, not merely something.** A total
  that renders is not a total that is correct. Check the figures.
- **Anything not PASS gets a line under Findings**, with what you did and what
  happened. "Doesn't work" is not actionable; "saved a 50% deposit and it billed
  the full $2,000" is.
- **Don't skip the boring ones.** Every money bug found so far was in something
  that looked fine at a glance.

Legend: `[ ]` untested · `[P]` pass · `[F]` fail · `[-]` not applicable / not built

---

## Run log

| Date | Build / commit | Who | Result |
|---|---|---|---|
| | | | |

---

## 1. Account and access

- [ ] Register a brand new account — lands in the app, no leftover data from any other account
- [ ] Log out, log back in — same data is there
- [ ] Log in with a wrong password — clear error, does not let you in
- [ ] Forgot password — the email arrives AND the link actually opens something
- [ ] Force-quit and reopen — still signed in
- [ ] A brand new account is NOT offered a previous account's unfinished draft

## 2. Quoting — the core path

- [ ] `+` from the quotes tab opens Describe
- [ ] `+` from the home split button opens Describe
- [ ] Describe: keyboard opens by itself, placeholder matches your trade
- [ ] Example chips appear on a first run and fill the field when tapped
- [ ] Microphone records and the transcript is appended into the same field
- [ ] Attaching a customer is optional — you can carry on without one
- [ ] Generate → questions appear (or go straight to Review)
- [ ] Clarify: answering the last question shows "Updating your quote…" **once**,
      then Review **once**, and the figures do not change again afterwards
- [ ] Skip all → lands on Review, skipped answers appear as assumptions
- [ ] Review: markup slider thumb starts at the percentage shown, not at the far left
- [ ] Dragging the slider moves total, profit, cost and customer price every frame
- [ ] Locking a line freezes its price, others keep moving, total still includes it
- [ ] Labour and Materials sections ease open and shut, no jump
- [ ] Editing a line and saving updates the totals
- [ ] Swipe to delete a line works and the totals follow
- [ ] "Round up" changes the headline total to a whole dollar
- [ ] Warning appears when lines have no cost recorded; does NOT appear when all do
- [ ] Preview PDF opens in the app (not the print dialog) and closes again
- [ ] Save draft works **with no customer attached**
- [ ] Send asks for a customer, and creating one there works
- [ ] Saved quote appears in the quotes list with the right total

## 3. Quoting — reopening and editing

- [ ] Open a saved quote — **line items add up to the total shown**
- [ ] Tweak opens the quote prefilled, not blank
- [ ] Edit a line, save, reopen — the edit survived
- [ ] Status changes (sent / accepted / declined) stick after reopening
- [ ] Duplicate makes a real copy
- [ ] Delete removes it from the list

## 4. Invoicing

- [ ] `+` on the invoices tab opens the invoice Describe with "Choose from a quote"
- [ ] Start from scratch works end to end
- [ ] Choose from a quote lists only quotes not already fully invoiced
- [ ] Picking a quote pre-fills the lines and the customer
- [ ] Markup slider is hidden when the invoice came from a quote
- [ ] Due date can be set and shows on the saved invoice
- [ ] Save, reopen, edit — changes survive

## 5. Deposits and balances — **never yet verified end to end**

On one accepted quote, in this order:

- [ ] Deposit 50%: Review says "Billing 50% — $X now" with the remainder underneath
- [ ] Saved deposit invoice total is **half the quote**, not the full amount
- [ ] It carries a DEPOSIT marker
- [ ] The quote stays **accepted**, not invoiced
- [ ] Balance on the same quote bills **exactly the remainder**
- [ ] The quote now flips to **invoiced**
- [ ] A fixed dollar deposit (not a percentage) bills that exact amount

## 6. Payments

- [ ] Record a full payment — invoice goes to paid
- [ ] Record a partial payment — invoice goes to partial, amount received shows
- [ ] The number pad accepts the amount properly
- [ ] Invoices tab Outstanding **drops by what was paid**, not the full invoice
- [ ] An invoice past its due date shows as overdue

## 7. PDF and sending

For each: check the figures on the page, not just that a page appears.

- [ ] Preview a quote — totals and line items match the app
- [ ] Page is **A4**, nothing cut off, nothing pushed to a stray second page
- [ ] Logo, business name, ABN and bank details appear where expected
- [ ] Settings → Quote styling: all six styles show a thumbnail
- [ ] Tapping a style saves it and the next PDF uses it
- [ ] Full-size preview opens and "Use this style" works
- [ ] Colour and type changes show up in the PDF
- [ ] Share sheet sends the PDF (email / SMS / share link)

## 8. GST

- [ ] With GST on: 10% line appears, total = subtotal + GST
- [ ] Turn GST off in settings: **no GST line anywhere**, total = subtotal
- [ ] PDF matches in both states
- [ ] Turn it back on afterwards

## 9. Customers

- [ ] Create a customer with only a name
- [ ] Call and text buttons open the right app
- [ ] Quote from a customer's page prefills them
- [ ] Customer's history shows their quotes, invoices and jobs
- [ ] Edit and delete

## 10. Jobs and calendar

- [ ] Create a job, set a date and time
- [ ] It appears on the calendar at the right time
- [ ] Link a quote and an invoice to a job; reopen — links survived
- [ ] Complete a job
- [ ] Calendar → Outreach lists overdue quotes and overdue invoices
- [ ] Sending a follow-up opens Messages prefilled

## 11. Receipts

- [ ] Profile → Receipts opens
- [ ] Scan a receipt — the total and date come out right
- [ ] Attach it to a job and it counts toward that job's cost
- [ ] A blurry or odd receipt fails **clearly**, rather than saving a wrong figure

## 12. Settings

- [ ] Business details: logo upload, ABN, address all save and persist
- [ ] Bank details save and appear on an invoice PDF
- [ ] Labour rate and markup defaults feed a new quote
- [ ] Payment terms change the due date on a new invoice
- [ ] Working hours, service area, reminders, notifications all save
- [ ] Dark mode — walk the whole app, no white-on-white or black-on-black
- [ ] Home widgets can be toggled and reordered

## 13. Behaviour under stress

The ones that bite real users:

- [ ] Aeroplane mode: a clear message, not a silent failure or a fake success
- [ ] Turn the network back on — the app recovers without a restart
- [ ] A quote with 30+ line items: PDF paginates sensibly
- [ ] Very long job title and customer name: nothing overflows the PDF
- [ ] A $0 quote and a $250,000 quote both render sanely
- [ ] Fractional quantities (2.5 hours) survive save and reopen
- [ ] Backgrounding the app mid-quote and returning does not lose the draft

---

## Findings

Anything marked `[F]` goes here. One line each: what you did, what happened, what
you expected.

| # | Area | What you did | What happened | Expected |
|---|---|---|---|---|
| | | | | |

---

## Known gaps — not bugs, don't re-report

- `quote_items.quantity` is a whole-number column, so the rows round fractional
  quantities. Display reads from the content JSON instead, so this is invisible —
  but the rows themselves are lossy.
- No "Declined" filter on the quotes tab; declined quotes appear only under All.
- `app/ai-chat.tsx` and `CreateAllSheet.tsx` are unreachable and pending deletion.
- Free Replit hosting expires around 10 Oct 2026; the backend goes down then unless
  moved. The database is already independent of Replit.
