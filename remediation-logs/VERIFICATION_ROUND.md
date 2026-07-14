# Final verification round — copy-paste for Claude-in-Chrome

## Restart terminals first
```
# Terminal 1 (API — auto-runs db:push for new columns)
cd <repo>
git pull origin main
doppler run -- npm run dev

# Terminal 2 (Expo web)
cd <repo>/mobile
npm install
npx expo start --web
```

## Prompt

**FINAL VERIFY — full pass. One line per check: PASS/FAIL + what you saw. Stop after these checks.**

You are verifying **Vargen** at `http://localhost:8081`. API at `localhost:5000`. Use DEV skip-login. Prefix test data `TEST-`. No real payments.

**Dark mode (switch via Profile → Appearance → Dark first):**
1. Open quotes list, a quote detail, invoices list, an invoice detail, job detail, receipts, price book, ai-chat — every screen dark, no white cards or flashes.
2. Open the `...` menu on a quote — bottom sheet is dark-themed.
3. On ai-chat draft step, the margin slider card is dark-themed.

**Money flows (switch back to light if you like):**
4. Manual quote (form mode, 2 items $100+$50) → save → convert to invoice → invoice shows both items, subtotal $150, GST $15.
5. On that invoice: partial payment $50, then $60 → paid amount $110. Third partial over the remainder → status flips to Paid, on-screen without navigating away.
6. Invoices list: the partially-paid invoice (make another) shows a "Partial" pill, not Draft.
7. ai-chat quote with Callout fee ON ($120) → generated quote includes a call-out line item.
8. Quote form "Send to customer" → channel sheet appears; Share marks it Sent.

**Jobs:**
9. Job detail `...` → Edit job → form prefilled → change title → save → detail shows new title.
10. Job detail `...` → Cancel job → status badge flips to Cancelled without leaving the screen.
11. Create two jobs at the same time today → calendar shows them side-by-side, both tappable.

**Receipts & misc:**
12. Tap a receipt card → edit screen opens → change amount → save → list reflects it.
13. Any save action → bottom snackbar slides up and auto-dismisses (no OK button).
14. Kill the API server, navigate around → error banners with retry, no dead screens; restart server → app recovers on its own.

Report: `#N PASS/FAIL — one line`.
