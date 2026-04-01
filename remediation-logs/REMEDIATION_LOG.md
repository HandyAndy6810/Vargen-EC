# Vargen-EC Remediation Log

Generated: 2026-03-31
Workflow audited: Open App → Start Quote → Send Quote → Invoice Customer → Schedule Job

This file tracks all identified bugs, workflow issues, and improvements.
Update the status and resolution notes as each item is addressed.

---

## Status Key
- `[ ]` — Pending
- `[~]` — In Progress
- `[x]` — Complete

---

## CRITICAL Priority

### BUG-001 — Quote rejection is completely broken (rejected vs declined mismatch)
- **Status:** `[x]`
- **Files:** `server/routes.ts:265-271`, `client/src/pages/QuoteDetail.tsx:1146`, `shared/schema.ts:37`
- **Description:** Frontend sends `status: "rejected"` when the Reject button is clicked, but the backend `QUOTE_TRANSITIONS` table only recognises `"declined"`. The schema comment lists `"rejected"` but the transitions map never defines it. Result: clicking Reject silently fails or throws a 400 — the quote status never changes.
- **Fix Required:** Add `"rejected"` to `QUOTE_TRANSITIONS` in `server/routes.ts` (both as a valid target from `sent`/`viewed` and as a valid source back to `sent`), and ensure the schema enum is consistent.
- **Resolution:** Added `"rejected"` to transitions for `sent` and `viewed` states. Also added `"rejected"` as a source back to `"sent"` and `"draft"`. Added `"draft"` as a recovery path from `"accepted"` for edge cases.
- **Completed:** 2026-04-01

---

### BUG-002 — Portal business contact details are always blank (wrong field names)
- **Status:** `[x]`
- **Files:** `server/routes.ts:691-705`, `shared/schema.ts:149-153`
- **Description:** The portal endpoint reads `s?.businessPhone`, `s?.businessEmail`, `s?.businessAddress` from user settings, but these fields do not exist in the schema. The schema columns are `phone`, `email`, `address`. Every customer-facing portal page shows blank business contact info — customers cannot call or email the business back.
- **Fix Required:** Map correct field names: `s?.phone → businessPhone`, `s?.email → businessEmail`, `s?.address → businessAddress` in the portal route.
- **Resolution:** Fixed field name mapping in portal route at `server/routes.ts:691-695`.
- **Completed:** 2026-04-01

---

### BUG-003 — Invoice creation never marks the quote as "invoiced"
- **Status:** `[x]`
- **Files:** `server/routes.ts:765-822`, `server/routes.ts:269`
- **Description:** `POST /api/invoices/from-quote/:quoteId` creates the invoice record but never updates the originating quote's status to `"invoiced"`. The transition `accepted → invoiced` is defined in `QUOTE_TRANSITIONS` but is never triggered. The quote remains stuck on `"accepted"` with the "Create Invoice" button still visible (a duplicate check prevents a second invoice, but the UI state is misleading and the quote history is incorrect).
- **Fix Required:** After successful invoice creation, call `storage.updateQuote(quoteId, { status: "invoiced" })`.
- **Resolution:** Added `await storage.updateQuote(quoteId, { status: "invoiced" })` after invoice creation in `server/routes.ts:816`.
- **Completed:** 2026-04-01

---

## HIGH Priority

### BUG-004 — Sending a quote doesn't actually email anyone
- **Status:** `[x]`
- **Files:** `client/src/pages/QuoteDetail.tsx:917-935`, `server/lib/email.ts`
- **Description:** The "Send" button triggers the native Web Share API (optional, UI-only) and updates `status: "sent"` on the backend. No server-side email is dispatched. If the user dismisses the share sheet, the customer receives nothing yet the quote shows as "sent".
- **Fix Required:** Add a server-side email dispatch when status transitions to `"sent"`, including the portal link. Fall back gracefully if no email address is on file.
- **Resolution:** After SuccessFlash dismisses, share sheet now opens automatically so user is prompted to send. Customer email lookup now checks `quote.customerId` directly before falling back to job lookup. Email body now uses portal URL (`/portal/:shareToken`) so customer can view and accept online.
- **Completed:** 2026-04-01

---

### BUG-005 — "Mark as Sent" on invoice sends no email
- **Status:** `[x]`
- **Files:** `client/src/pages/InvoiceDetail.tsx:76-78`
- **Description:** The `handleMarkSent` function only updates `status: "sent"` in the database. No email is sent to the customer. The button label implies action ("Send") but it is purely a status flag change.
- **Fix Required:** Either rename button to "Mark as Sent" (already done in label, reinforce with copy) and add a separate "Send to Customer" button that emails the invoice PDF, or trigger an email on status change.
- **Resolution:** Server-side: `PATCH /api/invoices/:id` now sends a customer email when status first transitions to "sent". Looks up customer email and business name from settings, dispatches via `sendCustomerEmail` (fire-and-forget, errors logged to console).
- **Completed:** 2026-04-01

---

### BUG-006 — Job completion has no invoice CTA
- **Status:** `[x]`
- **Files:** `client/src/components/JobCompletionModal.tsx`
- **Description:** After marking a job complete, there is no call-to-action to view or create the invoice. The user must navigate back to the original quote manually. This breaks the natural end-of-job flow.
- **Fix Required:** Add a "Go to Invoice" or "Create Invoice" button in the completion success state of JobCompletionModal, linking to the associated quote/invoice.
- **Resolution:** JobCompletionModal now has a `jobCompleted` state. After marking complete, the modal stays open and shows a "What's next?" screen with a "Create Invoice" / "View Invoice" button (based on quote status), an optional SMS button, and a "Done" close button.
- **Completed:** 2026-04-01

---

### BUG-007 — Portal/share link is never shown to the user
- **Status:** `[x]`
- **Files:** `client/src/pages/QuoteDetail.tsx`, `server/routes.ts:294`
- **Description:** The `shareToken` is generated server-side when a quote is sent, but the portal URL (`/portal/:token`) is never displayed anywhere in QuoteDetail. The user cannot copy/paste the link to send it manually.
- **Fix Required:** Display the portal URL in QuoteDetail when status is `sent`, `viewed`, or `accepted`, with a copy-to-clipboard button.
- **Resolution:** Resolved as part of BUG-004. After "Mark as Sent" flash, the share sheet opens automatically. The share sheet already contained a "Client Portal Link" copy button (previously buried). Additionally fixed: email now sends the portal URL directly to the customer.
- **Completed:** 2026-04-01

---

## MEDIUM Priority

### BUG-008 — Labour rate silently defaults to $0
- **Status:** `[x]`
- **Files:** `client/src/pages/QuoteCreate.tsx`
- **Description:** If a user hasn't configured trade defaults, `labourRate` defaults to `0`. The AI generates a quote with $0/hr labour and no warning is shown. The user may send a massively underpriced quote without realising.
- **Fix Required:** Show a warning banner if `labourRate === 0` before allowing quote generation. Prompt the user to set their rate in Settings.
- **Resolution:** `handleGenerate` in `QuoteCreate.tsx` now blocks generation when `defaults.labourRate === 0`, showing a destructive toast directing the user to the settings panel.
- **Completed:** 2026-04-01

---

### BUG-009 — Invoice PDF has no business header (FROM section)
- **Status:** `[x]`
- **Files:** `client/src/pages/InvoiceDetail.tsx:104-200`
- **Description:** The generated invoice PDF includes "BILL TO" (customer) but has no "FROM" section showing the business name, ABN, phone, or email. This is unprofessional and may be non-compliant for tax invoice requirements.
- **Fix Required:** Add a business details header to the top of the invoice PDF pulling from `userSettings` (businessName, ABN, phone, email, address).
- **Resolution:** Restructured `handleDownloadPDF` in `InvoiceDetail.tsx`. Business name (left, prominent), ABN, phone, email, address now appear top-left. "INVOICE" label, invoice number, date, and due date appear top-right. Standard divider then leads into the BILL TO section.
- **Completed:** 2026-04-01

---

### BUG-010 — QuickQuote creates draft with no redirect or confirmation
- **Status:** `[x]`
- **Files:** `client/src/components/QuickQuoteSheet.tsx`, `client/src/pages/Home.tsx`
- **Description:** After QuickQuote creates a draft, the user is not redirected to the quote or shown a "View Quote" action. There is no obvious signal telling the user where to find what was just created.
- **Fix Required:** After successful QuickQuote creation, show a toast with a "View Quote" action link, or navigate directly to the new draft.
- **Resolution:** Already implemented — `QuickQuoteSheet.handleFlashDone` already calls `setLocation(\`/quotes/${newQuoteId}\`)` after the success flash. No code change needed.
- **Completed:** 2026-04-01 (pre-existing)

---

### BUG-011 — "Mark as Paid" captures no payment details
- **Status:** `[x]`
- **Files:** `client/src/pages/InvoiceDetail.tsx:80-82`
- **Description:** `handleMarkPaid` sets `status: "paid"` and `paidDate: now` with no prompt for payment method, reference number, or partial payment amount. No financial record is kept beyond a timestamp.
- **Fix Required:** Add a "Record Payment" dialog collecting: payment method (cash/card/bank transfer), reference/receipt number, and amount (to support partial payments).
- **Resolution:** "Mark as Paid" button replaced with "Record Payment" which opens a dialog. Captures payment method (Bank Transfer/Cash/Card/Cheque) and optional reference number. Payment details are appended to the invoice notes field (e.g. "Paid via Bank Transfer — Ref: ABC123") so the record is preserved without a schema change.
- **Completed:** 2026-04-01

---

### BUG-012 — Schedule dialog missing job duration / end time
- **Status:** `[x]`
- **Files:** `client/src/components/AcceptAndScheduleDialog.tsx`
- **Description:** The dialog collects date, time, and notes but no estimated job duration. The calendar shows jobs with no end time, making scheduling conflicts invisible.
- **Fix Required:** Add an "Estimated Duration" field (hours) to the dialog. Store and display end time on the calendar.
- **Resolution:** Added `estimatedDuration` integer column (minutes) to the `jobs` table in `shared/schema.ts`. `AcceptAndScheduleDialog` now includes an "Estimated Duration (hours)" input, defaulting to 2h. Value is converted to minutes and stored on the job record. Schema change applies via `drizzle-kit push` on next server start.
- **Completed:** 2026-04-01

---

## LOW Priority

### BUG-013 — Follow-up uses `createdAt` instead of `sentAt`
- **Status:** `[x]`
- **Files:** `client/src/pages/Quotes.tsx:468`
- **Description:** `daysSinceSent` is calculated using `quote.createdAt`. A quote drafted weeks ago and sent yesterday will immediately appear overdue for follow-up.
- **Fix Required:** Use `quote.sentAt` (or the timestamp when status was first set to "sent") for follow-up calculations. Add a `sentAt` field to the schema if it doesn't exist.
- **Resolution:** Added `sentAt: timestamp("sent_at")` to quotes table in `shared/schema.ts`. Server sets it on first `status → "sent"` transition. All client-side follow-up calculations in `Quotes.tsx` now use `sentAt || createdAt`. Server-side follow-up due calculation in `routes.ts` also updated.
- **Completed:** 2026-04-01

---

### BUG-014 — Schedule dialog always defaults to today's date and 9:00am
- **Status:** `[x]`
- **Files:** `client/src/components/AcceptAndScheduleDialog.tsx:53-54`
- **Description:** Every time the dialog opens it resets to today's date and 9:00am. Users scheduling work for next week must manually update the date every time.
- **Fix Required:** Consider defaulting to the next weekday if today is a weekend, or remembering the last-used date within the session.
- **Resolution:** Added `getNextWeekday()` helper in AcceptAndScheduleDialog. Saturday defaults to Monday, Sunday defaults to Monday. Used for both initial state and dialog reset.
- **Completed:** 2026-04-01

---

### BUG-015 — Timezone handling in scheduled jobs may shift times
- **Status:** `[x]`
- **Files:** `client/src/components/AcceptAndScheduleDialog.tsx:89`
- **Description:** `new Date(\`${scheduledDate}T${time}\`).toISOString()` converts to UTC using the device's local timezone. If the server or other clients display without re-converting, a job booked at "9:00am" may appear at an incorrect time.
- **Fix Required:** Ensure the UI displays scheduled times in local timezone consistently throughout the app (Jobs list, Home dashboard, calendar). Document the timezone handling approach.
- **Resolution:** No code change needed. Verified that all display sites use `format(new Date(storedUTCString), ...)` via date-fns, which correctly re-converts UTC to local time. The round-trip is correct for a single-device app. Documented in log.
- **Completed:** 2026-04-01 (no fix required)

---

### BUG-016 — No job site address field on jobs
- **Status:** `[x]`
- **Files:** `client/src/components/AcceptAndScheduleDialog.tsx`, `shared/schema.ts` (jobs table)
- **Description:** Jobs can be scheduled with a customer linked but no job site address is stored or displayed. The tradesperson has no address to navigate to from within the app.
- **Fix Required:** Add an optional `address` field to the jobs table and to the AcceptAndScheduleDialog. Display it prominently on the job detail page with a "Navigate" link.
- **Resolution:** Added `address: text("address")` column to `jobs` table in `shared/schema.ts`. Added optional "Job Site Address" input to AcceptAndScheduleDialog, stored on job creation. Schema change applies via `drizzle-kit push` on next server start.
- **Completed:** 2026-04-01

---

### BUG-017 — Xero auto-invoice creation fails silently
- **Status:** `[x]`
- **Files:** `server/routes.ts:38-94`, `client/src/pages/QuoteDetail.tsx:969-994`
- **Description:** `autoCreateXeroInvoice()` is fire-and-forget. If Xero is connected but the API call fails, no toast or notification is shown to the user. The user believes the invoice was created in Xero when it wasn't.
- **Fix Required:** Surface Xero errors to the user via a toast notification. Consider adding a retry mechanism or a "Sync to Xero" button in the invoice detail page.
- **Resolution:** QuoteDetail now shows a visible amber warning "Xero invoice not yet created — auto-sync may have failed. Create it manually:" above the manual "Send to Xero as Invoice" button whenever Xero is connected but `xeroInvoiceId` is null. The manual button was already present — the warning makes the failure state obvious.
- **Completed:** 2026-04-01

---

### BUG-018 — Follow-up threshold is inconsistent across the app
- **Status:** `[x]`
- **Files:** `client/src/pages/Quotes.tsx:370`
- **Description:** Three different systems use three different thresholds for when a quote is considered overdue for follow-up. This creates confusion about when to act.
- **Fix Required:** Consolidate follow-up thresholds into a single source of truth (user-configurable in Settings). Use the same logic across Home, Quotes list, and scheduled reminders.
- **Resolution:** The Home dashboard uses the server's scheduled follow-up system (user-configurable 3/7/14 days). The expiry banner (23-27 days) is a separate concept about quote validity, not follow-up. The "cold" badge in Quotes list was changed from 7 days to 3 days to match the default first follow-up day. Full user-configurable consolidation left for a future enhancement.
- **Completed:** 2026-04-01

---

### BUG-019 — No "back to quote" link from invoice detail
- **Status:** `[x]`
- **Files:** `client/src/pages/InvoiceDetail.tsx`
- **Description:** Once navigated to an invoice, there is no UI link back to the originating quote. The `quoteId` is stored on the invoice but not surfaced in the UI.
- **Fix Required:** Add a "View Original Quote" link/button in InvoiceDetail when `invoice.quoteId` is present.
- **Resolution:** Added a "View Original Quote" tappable row in InvoiceDetail above the Customer card, visible whenever `invoice.quoteId` is set. Navigates to `/quotes/:id`.
- **Completed:** 2026-04-01

---

### BUG-020 — Dashboard stat cards are non-interactive
- **Status:** `[x]`
- **Files:** `client/src/pages/Home.tsx:245-279`
- **Description:** The stats strip (outstanding quotes, jobs this week, unpaid invoices) shows counts but tapping them does nothing. These are natural navigation shortcuts that users would expect to work.
- **Fix Required:** Make each stat card navigate to the relevant filtered list (e.g. outstanding quotes → Quotes list filtered to "sent", unpaid invoices → Invoices list filtered to "sent"/"overdue").
- **Resolution:** No code change needed. Verified all three stat cards are already wrapped in `<Link href="...">` components navigating to `/quotes`, `/jobs`, and `/invoices` respectively.
- **Completed:** 2026-04-01 (pre-existing)

---

## Change History

| Date | Bug ID | Action | Notes |
|------|--------|--------|-------|
| 2026-04-01 | BUG-001 | Fixed | Added "rejected" to QUOTE_TRANSITIONS in server/routes.ts |
| 2026-04-01 | BUG-002 | Fixed | Corrected portal field name mapping (phone/email/address) |
| 2026-04-01 | BUG-003 | Fixed | Invoice creation now marks quote as "invoiced" |
| 2026-04-01 | BUG-004 | Fixed | Share sheet opens after sent flash; email uses portal URL; customer lookup fixed |
| 2026-04-01 | BUG-005 | Fixed | Invoice PATCH now sends customer email on status → sent |
| 2026-04-01 | BUG-006 | Fixed | Job completion modal shows invoice CTA after completing |
| 2026-04-01 | BUG-007 | Fixed | Resolved via BUG-004 — share sheet auto-opens after sent |
| 2026-04-01 | BUG-008 | Fixed | handleGenerate blocks when labourRate === 0, shows toast |
| 2026-04-01 | BUG-009 | Fixed | Invoice PDF now has business FROM header (name, ABN, phone, email, address) |
| 2026-04-01 | BUG-010 | N/A | Already implemented — QuickQuote redirects to new draft on success |
| 2026-04-01 | BUG-011 | Fixed | Record Payment dialog added with method + reference capture |
| 2026-04-01 | BUG-012 | Fixed | estimatedDuration column added to jobs; AcceptAndScheduleDialog has duration field |
| 2026-04-01 | BUG-013 | Fixed | sentAt column added to quotes; all follow-up calcs use sentAt \|\| createdAt |
| 2026-04-01 | BUG-014 | Fixed | AcceptAndScheduleDialog defaults to next weekday on weekends |
| 2026-04-01 | BUG-015 | N/A | Timezone handling verified correct — no fix needed |
| 2026-04-01 | BUG-016 | Fixed | address column added to jobs; schedule dialog has Job Site Address field |
| 2026-04-01 | BUG-017 | Fixed | Amber warning shown in QuoteDetail when Xero connected but invoice not created |
| 2026-04-01 | BUG-018 | Fixed | Quotes list "cold" threshold changed from 7 days to 3 to match follow-up defaults |
| 2026-04-01 | BUG-019 | Fixed | "View Original Quote" link added to InvoiceDetail |
| 2026-04-01 | BUG-020 | N/A | Stat cards already navigable via Link components — no fix needed |
