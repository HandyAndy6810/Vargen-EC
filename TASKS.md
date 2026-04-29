# Deferred Tasks

Items the user asked to address later. Check here when unsure what to work on next.

## Pending

- [ ] **Trade type on sign-up** — Add trade type selector to registration screen. Pre-fill quick suggestions and AI context from this value. Also expose it in user profile settings so it can be changed later.
- [ ] **Quote templates** — "Save as template" on AI draft step and "From template" on create screen both show coming-soon. Need: template storage (DB table), save flow, template picker, apply-template-to-form.
- [ ] **Photo / receipt quoting** — Camera button on create screen is a no-op. Needs image pick → OCR or AI vision → pre-fill description.
- [ ] **Customer lookup ("Existing customer")** — "Existing" toggle on AI quote form shows coming-soon. Needs: customer list endpoint, search/select UI, pre-fill customer name from selected record.
- [ ] **Send to customer** — "Send to customer" button on manual form saves with status 'sent' but doesn't actually send anything. Needs: email/SMS delivery, PDF generation.
- [ ] **Stripe payments** — Stripe payment link on invoice detail already works but needs testing end-to-end in production.
- [ ] **Bank transfer / EFT details** — Invoice detail has a static BSB/account placeholder. Needs: real account details from user profile settings.

## Completed

- [x] AI quoting with Groq (free tier)
- [x] Quote list with real data
- [x] Quote detail with real line items, real status, convert-to-invoice button
- [x] Invoice detail with real line items, real due date, real status
- [x] Invoice create — both from-quote and standalone flows
- [x] Quote create — description text box, quick suggestions fill input, From template button
- [x] AI chat — accepts description param from create screen, Save as template placeholder
