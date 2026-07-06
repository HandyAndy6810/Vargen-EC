# Vargen Execution Runbook — post-Batch-A

## DECISIONS RESOLVED (2026-07-06) — supersede the choice text inside entries
- **Backend edits ALLOWED** for F1, F10, F11, F12, B5, D5, D10: apply the "backend option" halves. After F11's backend fix, remove the create-then-PATCH workaround in mobile/app/invoices/create.tsx (search `// Server always creates as draft`).
- **F9 → Option A** (channel ActionSheet, mirror ai-chat sendActions).
- **D5 → EXPANDED**: full job edit mode in jobs/create.tsx via `?editId=` (prefill from useJob, save via useUpdateJob) + Cancel job + Delete job (add DELETE /api/jobs/:id — verify absent first). Wire all three into the job-detail ... ActionSheet.
- **D9 → split** into PromptStep/DraftStep + useAiQuoteForm hook, own commit AFTER the file's C3 migration.
- Defaults: D2 title → "Invoices"; D10 → build receipt detail/edit + PATCH endpoint, DEFER image storage; D12 → keep CyclingPill (13px + a11y label only); D13 → defer plan data.

Executor notes: work top-to-bottom. Anchors are unique code snippets — find by search, never line number. All paths relative to repo root. `c.` = theme colors from `useTheme()`. Batch A is DONE (commits 3a1fc9d…44373b6) — do not revisit except where an entry explicitly extends a Batch A file.

Already fixed during audit (do not redo): quotes/[id].tsx `sheetMode` useState moved above early returns (44373b6).

---

## SECTION 0 — Build gate

### [P0-1] Typecheck has never run
- **Type:** `run-command`
- **File(s):** mobile/
- **Current:** No environment so far could run tsc; unused imports and type errors may exist beyond what reading found.
- **Target:**
  ```bash
  cd mobile && npm install && npx tsc --noEmit
  ```
  Fix every error it reports before proceeding. Known likely hits: unused `Platform` import in `app/jobs/[id].tsx` (remove from the react-native import block); possibly unused `Alert` stragglers.
- **Depends on:** none
- **Verify:** tsc exits 0.
- **Risk:** none.

---

## SECTION 1 — Phase 1 new findings

### [F1] Manual quote → invoice converts with ZERO line items
- **Type:** `needs-my-decision` (frontend fix works for new quotes; backend fix also repairs existing quotes)
- **File(s):** mobile/app/quotes/create.tsx (frontend) · server/routes.ts (backend option)
- **Anchor (frontend):**
  ```ts
      const mergedContent: any = {
        ...originalContent,
        customerName: customer, jobTitle, schedDate, expiryDate, notes, lines,
      };
      if (originalContent.items) {
  ```
- **Current:** `server/routes.ts` `POST /api/invoices/from-quote/:quoteId` reads only `content.items`. Manual quotes store `content.lines` and (except when editing an AI quote) no `items`, no `subtotal`, no `gstAmount`. Result: converted invoice has empty `items`, `subtotal` = quote total **including** GST, `gstAmount: 0`. Invoice PDF prints no line items and a wrong GST breakdown.
- **Target (frontend-only, fixes new/edited quotes):** make the `items` sync unconditional. Replace `if (originalContent.items) {` with always-on emission:
  ```ts
      // Always emit the canonical `items` shape + totals so quote→invoice
      // conversion (which reads content.items) never produces an empty invoice
      mergedContent.items = lines.map(l => ({
        description: l.name,
        quantity: parseFloat(l.qty) || 1,
        unit: 'ea',
        unitPrice: parseFloat(l.price) || 0,
      }));
      mergedContent.subtotal = subtotal;
      mergedContent.gstAmount = gst;
      mergedContent.totalAmount = total;
  ```
  (delete the surrounding `if (originalContent.items) { ... }` wrapper, keep the body once).
- **Target (backend option, also fixes old quotes):** in the from-quote handler, after `items = (content.items || []).map(...)`, add:
  ```ts
      if (items.length === 0 && Array.isArray(content.lines)) {
        items = content.lines.map((l: any) => ({
          description: l.name, quantity: Number(l.qty) || 1, unit: 'each',
          unitPrice: Number(l.price) || 0,
          total: (Number(l.qty) || 1) * (Number(l.price) || 0),
        }));
        subtotal = items.reduce((s: number, i: any) => s + i.total, 0);
        gstAmount = +(subtotal * 0.1).toFixed(2);
      }
  ```
- **Depends on:** none
- **Verify:** create a manual quote (form mode, 2 line items) → Convert → invoice detail shows both items and correct subtotal/GST split.
- **Risk:** low; changes saved content shape (additive only).

### [F2] Second partial payment overwrites the first
- **Type:** `frontend-blind`
- **File(s):** mobile/app/invoices/[id].tsx
- **Anchor:**
  ```ts
    const handleRecordPartial = () => {
      const amount = parseFloat(partialAmt);
      if (!amount || amount <= 0) { showAlert('Enter a valid amount'); return; }
      const total = invoice?.totalAmount ? parseFloat(invoice.totalAmount) : 0;
      if (amount >= total) {
        updateInvoice.mutate({ id: invoiceId, status: 'paid', paidDate: new Date().toISOString() as any });
      } else {
        updateInvoice.mutate({ id: invoiceId, status: 'partial', paidAmount: amount.toString() } as any);
      }
  ```
- **Current:** Client sends `paidAmount` directly, which the server PATCH stores verbatim — but the server's accumulate-and-auto-promote logic only runs when the body has numeric `payAmount`. Recording $200 then $300 leaves `paidAmount = 300`, not 500, and never auto-promotes to paid.
- **Target:** replace the whole if/else with one call that lets the server accumulate and decide status:
  ```ts
      updateInvoice.mutate({ id: invoiceId, payAmount: amount } as any);
  ```
  (server sets `partial` or `paid` + `paidDate` itself — see routes.ts PATCH /api/invoices/:id).
- **Depends on:** B2 (detail invalidation) for the screen to visibly refresh.
- **Verify:** record two partials summing over total → invoice becomes `paid`; sum under total → `paidAmount` equals the sum.
- **Risk:** low; removes client-side status guessing.

### [F3] ai-chat `jobType` stuck on "Plumbing"
- **Type:** `frontend-blind`
- **File(s):** mobile/app/ai-chat.tsx
- **Anchor:**
  ```ts
    useEffect(() => {
      if (userSettings) {
        if (userSettings.tradeType) setTradeType(userSettings.tradeType);
        if (userSettings.labourRate) setLabourRate(String(userSettings.labourRate));
      }
    }, [userSettings]);
  ```
- **Current:** `jobType` is initialised from `tradeType`'s initial value ('Plumbing') and never updated when settings load, so an electrician's quotes save `jobType: "Plumbing"` unless manually edited.
- **Target:** inside the same effect, after `setTradeType(...)`, add:
  ```ts
        if (userSettings.tradeType) setJobType(prev => prev === 'Plumbing' ? userSettings.tradeType : prev);
  ```
  Also, in the trade-type dropdown selection handler (search `setShowTradeDropdown(false)` inside the Modal's option onPress), mirror the choice: `setJobType(t)` alongside `setTradeType(t)`.
- **Depends on:** none
- **Verify:** with settings.tradeType = 'Electrical', open ai-chat → generate → draft "Type" field shows Electrical.
- **Risk:** none.

### [F4] ai-chat billing address collected then thrown away
- **Type:** `frontend-blind`
- **File(s):** mobile/app/ai-chat.tsx
- **Anchor (in saveMutation's post-generation content JSON):**
  ```ts
          customerAddress: customerAddress || undefined,
          customerNotes: customerType === 'new' ? custNotes.trim() || undefined : undefined,
        }),
  ```
- **Current:** `billingAddress` state exists with a full input UI (shown when `!billingSameAsSite`) but is absent from the save payload.
- **Target:** add one line above `customerNotes`:
  ```ts
          billingAddress: customerType === 'new' && !billingSameAsSite ? billingAddress.trim() || undefined : undefined,
  ```
  Apply to BOTH content JSON blocks in saveMutation (bare-draft path and full path).
- **Depends on:** none
- **Verify:** save a quote with billing ≠ site → quote content JSON contains billingAddress.
- **Risk:** none (additive field; nothing reads it yet — PDF can pick it up later).

### [F5] ai-chat item-save loop: mid-loop failure orphans the quote and invites duplicates
- **Type:** `frontend-blind`
- **File(s):** mobile/app/ai-chat.tsx
- **Anchor:**
  ```ts
        const quote = await res.json();
        for (const item of editableItems) {
          await apiRequest('POST', `/api/quotes/${quote.id}/items`, {
  ```
- **Current:** If item POST #2 of 4 fails, the mutation throws, `savedQuoteId` never set, user retries → a second quote is created. Items also fail silently as a batch.
- **Target:**
  ```ts
        const quote = await res.json();
        // Set immediately so a retry after item failure PATCHes this quote
        // instead of creating a duplicate
        setSavedQuoteId(quote.id);
        const failed: string[] = [];
        for (const item of editableItems) {
          try {
            await apiRequest('POST', `/api/quotes/${quote.id}/items`, {
              description: item.description,
              quantity: parseFloat(item.qty) || 1,
              price: String(Math.round((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) * 100) / 100),
            });
          } catch { failed.push(item.description); }
        }
        if (failed.length) showAlert('Some items did not save', `Check the quote and re-add: ${failed.join(', ')}`);
        return quote;
  ```
  (delete the old bare loop.)
- **Depends on:** none
- **Verify:** hard to repro offline mid-loop; code-review verification is acceptable. Quote detail falls back to `content.items` when quoteItems is short, so display remains correct.
- **Risk:** low. Behaviour change: partial item failure warns instead of erroring the whole save.

### [F6] Quote expiry stored as locale text → overdue detection silently breaks
- **Type:** `frontend-blind`
- **File(s):** mobile/app/ai-chat.tsx · mobile/app/(tabs)/quotes.tsx
- **Anchor (ai-chat):**
  ```ts
    const pickExpiryDays = (days: number) => {
      setExpiryDays(days);
      const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      setExpiryDate(d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
  ```
- **Current:** `expiryDate` is a display string that's also user-editable free-text; `(tabs)/quotes.tsx` does `new Date(q.expiryDate)` for the Overdue filter — any locale/typo yields Invalid Date and the quote silently never shows as overdue.
- **Target:** store an ISO companion. In ai-chat add state `const [expiryDateISO, setExpiryDateISO] = useState(() => new Date(Date.now() + 30*86400000).toISOString());`, set it inside `pickExpiryDays` (`setExpiryDateISO(d.toISOString());`), and add `expiryDateISO,` to both saveMutation content JSONs next to `expiryDate,`. In (tabs)/quotes.tsx, where content is parsed for the overdue check, prefer `content.expiryDateISO ?? content.expiryDate` before `new Date(...)`, and guard: `const exp = new Date(...); if (isNaN(exp.getTime())) return false;`.
- **Depends on:** none
- **Verify:** create quote with 7-day expiry; hand-set device date +8d (or temporarily filter with a past ISO) → appears in Overdue tab.
- **Risk:** low; additive.

### [F7] Unauthenticated deep links reach all 26 stack screens
- **Type:** `frontend-blind`
- **File(s):** mobile/app/_layout.tsx
- **Anchor:**
  ```ts
    useEffect(() => {
      loadCachedUser()
        .then((user) => {
          if (user) queryClient.setQueryData(['/api/auth/user'], user);
        })
        .catch(() => {})
        .finally(() => setAuthReady(true));
    }, []);
  ```
- **Current:** Auth guard lives only in `(tabs)/_layout.tsx`; every screen registered in the root Stack (quotes/[id], invoices/create, settings/*, ai-chat, …) renders unauthenticated via deep link/notification. Server still 401s data, so it's a UX dead-end not a data leak — but forms silently fail. Also `router.push(data.screen)` from notifications is unvalidated.
- **Target:** in the notification response listener, whitelist prefixes:
  ```ts
        const data = response.notification.request.content.data as any;
        const ALLOWED = ['/quotes', '/invoices', '/jobs', '/customers', '/(tabs)', '/calendar'];
        if (typeof data?.screen === 'string' && ALLOWED.some(p => data.screen.startsWith(p))) {
          router.push(data.screen);
        }
  ```
  For the guard itself: replicate the (tabs) guard pattern — read `(tabs)/_layout.tsx`'s auth check (it reads the `['/api/auth/user']` query) and add the same check + `<Redirect href="/(auth)/login" />` to a small wrapper used by the root Stack, OR (simpler, recommended) rely on B1's centralized 401 → login redirect in apiRequest, which converts every unauth screen into an automatic bounce to login on first fetch. If B1 lands, only the notification whitelist above is needed here.
- **Depends on:** B1
- **Verify:** logged out, open `http://localhost:8081/quotes/1` → bounced to login (after B1).
- **Risk:** low.

### [F8] ai-chat dead code (~13 orphaned styles + unused constant)
- **Type:** `frontend-blind`
- **File(s):** mobile/app/ai-chat.tsx
- **Anchor:** `const GREEN       = '#2a9d4c';` (module constants block)
- **Current:** Unused from an older chat UI: `GREEN` constant; styles `heroHeading`, `heroSub`, `suggestionRow`, `suggestionText`, `composer`, `composerInput`, `composerSend`, `quoteTitle`, `lineRow`, `lineDesc`, `lineMeta`, `customerInput`, `fieldLabel` (verify each with a usage grep before deleting — some names may have been re-referenced since).
- **Target:** delete confirmed-unused entries. Grep pattern per name: `grep -n "s\.<name>" mobile/app/ai-chat.tsx`.
- **Depends on:** none
- **Verify:** tsc clean; screen renders both steps.
- **Risk:** none if grep-verified.

### [F9] quotes/create form-mode "Send to customer" sends nothing
- **Type:** `needs-my-decision`
- **File(s):** mobile/app/quotes/create.tsx
- **Anchor:** search `'sent'` inside quotes/create.tsx — the form-mode footer button whose onPress calls `saveMutation.mutate('sent')` then `router.back()`.
- **Current:** Button says "Send to customer" but only flips status and navigates back; no email/SMS/share is triggered. Customer receives nothing; tradie believes it's sent.
- **Option A (match ai-chat, recommended):** import `ActionSheetModal`/`SheetAction` + add `showSendSheet` state; on button press open the sheet with Email/SMS/Share actions that call `saveMutation.mutate('sent', { onSuccess: ... open channel ... })`. Copy the `sendActions` block from ai-chat.tsx (search `const sendActions: SheetAction[]`) and adapt: contact fields are `customer` (name) — form mode has no phone/email fields, so Email/SMS entries should only appear when a linked `selectedCustomer` provides them; otherwise Share only.
- **Option B (minimal honesty):** rename the button "Save as sent" and add a toast explaining nothing was delivered.
- **Depends on:** none
- **Verify:** A: tapping Send opens the channel sheet; picking Share opens the share dialog and quote status = sent. B: label reads Save as sent.
- **Risk:** A changes UX flow (adds one tap); B changes copy only.

### [F10] Backend `rejected` vs `declined` split
- **Type:** `needs-my-decision` (backend; frontend already tolerates both)
- **File(s):** server/routes.ts · server/storage.ts
- **Anchor:** `await storage.updateQuote(quote.id, { status: "rejected" });` (portal decline handler) and `} else if (q.status === "rejected") {` (storage stats).
- **Current:** Portal declines write `rejected`; app writes `declined`; stats count only `rejected`. Frontend shows both as "Declined" since Batch A.
- **Target (backend):** standardize on `declined`: change the portal handler to `{ status: "declined" }`; change storage stats condition to `q.status === "rejected" || q.status === "declined"` (keep both for historical rows). Optional data migration: `UPDATE quotes SET status='declined' WHERE status='rejected';`
- **Depends on:** none
- **Verify:** decline via portal → app shows Declined pill; stats include it.
- **Risk:** low.

### [F11] Server hardcodes invoice status "draft" on POST
- **Type:** `needs-my-decision` (backend; frontend workaround already shipped in Batch A)
- **File(s):** server/routes.ts
- **Anchor:** `const { customerId, customerName, items, dueDate, notes, includeGST } = req.body;` (POST /api/invoices)
- **Current:** Frontend creates then PATCHes to `sent` (two round-trips, brief draft flash).
- **Target (backend):** destructure `status` from body and pass `status: status === 'sent' ? 'sent' : 'draft',` to `storage.createInvoice`. Then in mobile/app/invoices/create.tsx remove the Batch A workaround (search `// Server always creates as draft; promote to sent`) and instead pass `status` through `useCreateInvoice`'s payload (add `status?: 'draft' | 'sent'` to its data type and spread into the POST body).
- **Depends on:** none
- **Verify:** Create invoice (sent) → single POST, invoice status sent.
- **Risk:** low.

### [F12] ⚠️UNVERIFIED — server AI prompt may ignore callOutFee
- **Type:** `needs-my-decision`
- **File(s):** server (quote generation route/prompt)
- **Current:** Client sends `callOutFee` in POST /api/quotes/generate. Round-9 browser audit reported no call-out line item in the generated quote. The toggle UI is fine (reveals an amount input) — the suspect is the server prompt.
- **How to confirm:** grep server for `callOutFee` in the /api/quotes/generate handler; check whether it's injected into the LLM prompt or appended as a fixed line item after generation.
- **Target if confirmed:** append deterministically server-side after AI response: push `{ description: 'Call-out fee', quantity: 1, unitPrice: callOutFee }` into items and recompute totals — don't trust the LLM with arithmetic.
- **Risk:** low.

---

## SECTION 2 — Batch B (data layer)

Apply in order. B1 first — later entries assume it.

### [B1] queryClient defaults + centralized 401 handling
- **Type:** `frontend-blind`
- **File(s):** mobile/lib/queryClient.ts · mobile/lib/api.ts
- **Anchor (queryClient.ts):**
  ```ts
  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
  ```
- **Current:** Infinite staleness + zero retries + no reconnect refetch; the exported `getQueryFn` (the only 401→login logic) is dead code — every hook hand-rolls fetch, so expired sessions just error forever.
- **Target 1 (queryClient.ts):**
  ```ts
  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 2,
      },
      mutations: {
        retry: 0,
      },
    },
  });
  ```
  Delete the now-unused `getQueryFn` (and its `router`/`clearCachedUser` imports) AFTER Target 2 lands.
- **Target 2 (api.ts — centralize 401):** in `apiRequest`, after `const res = await fetch(...)`, insert:
  ```ts
      if (res.status === 401 && !path.startsWith('/api/auth') && !path.startsWith('/api/login') && !path.startsWith('/api/dev-login')) {
        const { clearCachedUser } = await import('./auth-cache');
        const { queryClient } = await import('./queryClient');
        const { router } = await import('expo-router');
        await clearCachedUser();
        queryClient.setQueryData(['/api/auth/user'], null);
        router.replace('/(auth)/login' as any);
      }
  ```
  (dynamic imports avoid the api↔queryClient import cycle.)
- **Depends on:** none
- **Verify:** kill the API server's session (restart server) while on quotes tab → app bounces to login instead of erroring forever. tsc clean (no unused imports left in queryClient.ts).
- **Risk:** MEDIUM — staleTime 30s makes screens refetch on remount; watch for toast spam from refetch-triggered errors. Behaviour change: session expiry now logs out globally.

### [B2] Detail-key invalidation gaps
- **Type:** `frontend-blind`
- **File(s):** mobile/hooks/use-quotes.ts · mobile/hooks/use-invoices.ts · mobile/hooks/use-jobs.ts
- **Anchor (use-quotes.ts useUpdateQuote):**
  ```ts
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
        toast({ title: "Quote Updated", description: "Status changed successfully." });
      },
  ```
- **Current:** Update/delete/convert mutations invalidate only list keys. With any staleTime, the detail screen the user is standing on shows stale data after its own mutation (e.g. mark invoice paid → screen doesn't change).
- **Target:** change each `onSuccess` to receive variables and invalidate the detail key too:
  - use-quotes.ts `useUpdateQuote`: `onSuccess: (_data, vars) => { queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] }); queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, vars.id] }); queryClient.invalidateQueries({ queryKey: [`/api/quotes/${vars.id}/items`] }); toast(...); }`
  - use-invoices.ts `useUpdateInvoice`: same pattern with `[api.invoices.get.path, vars.id]`.
  - use-invoices.ts `useConvertQuoteToInvoice`: `onSuccess: (_data, quoteId) =>` add `queryClient.invalidateQueries({ queryKey: [api.quotes.get.path, quoteId] });`
  - use-jobs.ts `useUpdateJob`: add `queryClient.invalidateQueries({ queryKey: [api.jobs.get.path, vars.id] });` (jobs/complete.tsx already does this manually — the hook should own it).
- **Depends on:** B1 (makes the gap user-visible; fix regardless)
- **Verify:** invoice detail → Mark paid → status pill updates in place without navigating away.
- **Risk:** low.

### [B3] Real login/register never persist the auth cache
- **Type:** `frontend-blind`
- **File(s):** mobile/app/(auth)/login.tsx · mobile/app/(auth)/register.tsx
- **Anchor (identical in both):**
  ```ts
      onSuccess: (user) => {
        queryClient.setQueryData(["/api/auth/user"], user);
        router.replace("/(tabs)");
      },
  ```
- **Current:** Only the DEV bypass calls `saveCachedUser`; a real user who reopens the app offline is dumped to login, defeating the offline bootstrap in _layout.tsx.
- **Target (both files):**
  ```ts
      onSuccess: async (user) => {
        await saveCachedUser(user);
        queryClient.setQueryData(["/api/auth/user"], user);
        router.replace("/(tabs)");
      },
  ```
  login.tsx already imports `saveCachedUser` (used by DEV path); register.tsx needs `import { saveCachedUser } from '@/lib/auth-cache';`.
- **Depends on:** none
- **Verify:** log in normally, kill app, stop API server, reopen → lands on tabs (cached), not login.
- **Risk:** none.

### [B4] Production falls back to cleartext localhost API
- **Type:** `frontend-blind`
- **File(s):** mobile/lib/api.ts
- **Anchor:**
  ```ts
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(":")[0] ?? "localhost";

    if (Platform.OS === "android") {
      return `http://${localhost}:5000`;
    }

    return `http://${localhost}:5000`;
  ```
- **Current:** Missing `EXPO_PUBLIC_API_URL` in an EAS build silently points the app (and session cookies) at `http://localhost:5000`. Android/iOS branches are identical (dead conditional).
- **Target:**
  ```ts
    if (!__DEV__) {
      // A production build without a configured API URL must fail loudly,
      // not silently send auth cookies to localhost over http
      throw new Error('EXPO_PUBLIC_API_URL is not set in this production build');
    }
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(":")[0] ?? "localhost";
    return `http://${localhost}:5000`;
  ```
  (remove the redundant Android branch and its comment; `Platform` import stays only if still used — it isn't → remove.)
- **Depends on:** none
- **Verify:** tsc clean; dev still resolves LAN host. ⚠️UNVERIFIED whether any EAS profile omits the env — check `mobile/eas.json` env blocks.
- **Risk:** a misconfigured prod build now crashes at boot instead of half-working. That is the point.

### [B5] Push token fetched then discarded
- **Type:** `needs-my-decision` (needs a backend endpoint)
- **File(s):** mobile/app/_layout.tsx · server/routes.ts (+ schema)
- **Anchor:**
  ```ts
      if (finalStatus !== 'granted') return;
      await Notifications.getExpoPushTokenAsync();
  ```
- **Current:** Token never leaves the device; server can never push. All other push plumbing exists.
- **Target (frontend):**
  ```ts
      if (finalStatus !== 'granted') return;
      const token = await Notifications.getExpoPushTokenAsync();
      const { apiRequest } = await import('@/lib/api');
      await apiRequest('POST', '/api/push-token', { token: token.data });
  ```
  **Target (backend):** `app.post('/api/push-token', requireAuth, ...)` storing token against the user (new column `users.expoPushToken` or a tokens table). ⚠️UNVERIFIED — no such endpoint exists today; decide storage shape.
- **Depends on:** backend decision
- **Verify:** log in on device → server row has token.
- **Risk:** low.

### [B6] Dead code: `notifListener` ref never assigned
- **Type:** `frontend-blind`
- **File(s):** mobile/app/_layout.tsx
- **Anchor:** `const notifListener = useRef<Notifications.Subscription | null>(null);`
- **Target:** delete the ref declaration and the `notifListener.current?.remove();` line in the cleanup.
- **Depends on:** none · **Verify:** tsc clean. · **Risk:** none.

---

## SECTION 3 — Batch C (design system foundation)

### [C1] Canonical tokens — decisions made, use these values
- **Type:** `frontend-blind`
- **File(s):** NEW mobile/theme/tokens.ts · mobile/hooks/use-theme.ts
- **Decisions:**
  - **Brand orange: `#f26a2a`** (23 files already use it; the theme's `#FF5C00` loses). `orangeDeep: '#d94d0e'`, `orangeSoft: '#ffe6d3'` (light) / `'rgba(242,106,42,0.16)'` (dark).
  - **Spacing scale:** `2, 4, 8, 12, 16, 20, 24, 32, 40` — export as `space = { xxs:2, xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32, huge:40 }`.
  - **Type scale (replaces 26 ad-hoc sizes):** `caption:11, small:12, body:13, bodyLg:15, title:17, heading:20, display:24, hero:30` with weights via existing Manrope families (500/600/700/800). Minimum for load-bearing text: `small` (12). Nothing below `caption` (11) ever.
  - **Radius:** `sm:10, md:14, lg:18, xl:22, pill:999`.
  - **Hit target:** `minHeight: 44` constant `HIT = 44`.
- **Target:** create `mobile/theme/tokens.ts` exporting `space`, `type`, `radius`, `HIT`. Update `use-theme.ts` `lightColors.orange` → `#f26a2a`, `orangeDeep` → `#d94d0e`, `orangeSoft` → `#ffe6d3`; same keys in `darkColors` (orange stays `#f26a2a`, orangeSoft → `rgba(242,106,42,0.16)`). Update `_layout.tsx` ErrorBoundary btn `#FF5C00` → `#f26a2a`.
- **Verify:** tabs + themed screens render with the warmer orange; grep `FF5C00` returns nothing.
- **Risk:** subtle brand-color shift on the 18 themed screens.

### [C2] Rebuild the 9 unused primitives, themed + accessible
- **Type:** `frontend-blind`
- **File(s):** mobile/components/ui/{Screen,Card,Pill,IconButton,PrimaryButton,SecondaryButton,EmptyState,StatusBadge,SectionHeader}.tsx · also theme-enable mobile/components/ActionSheetModal.tsx, mobile/components/PDFComposeModal.tsx, mobile/components/MarginSlider.tsx
- **Current:** ui/ primitives hardcode light hexes (`#faf9f7`, `#1c1917`) and have zero adopters — rebuild freely, no regression risk. ActionSheetModal (Batch A) is deliberately light-only.
- **Target:** every primitive reads `useTheme()` + tokens. Contract for buttons (pattern for the rest):
  ```tsx
  // PrimaryButton.tsx
  import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
  import { useTheme } from '@/hooks/use-theme';
  import { radius, type as t, HIT } from '@/theme/tokens';

  export function PrimaryButton({ label, onPress, disabled, loading, destructive }: {
    label: string; onPress: () => void; disabled?: boolean; loading?: boolean; destructive?: boolean;
  }) {
    const { colors: c } = useTheme();
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        style={{
          minHeight: HIT + 10, borderRadius: radius.lg,
          backgroundColor: destructive ? c.red : c.orange,
          alignItems: 'center', justifyContent: 'center',
          opacity: disabled ? 0.5 : 1, paddingHorizontal: 20,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> :
          <Text style={{ fontSize: t.bodyLg, fontFamily: 'Manrope_800ExtraBold', color: '#fff' }}>{label}</Text>}
      </TouchableOpacity>
    );
  }
  ```
  IconButton: 44×44 min, REQUIRED `label` prop → `accessibilityLabel`. ActionSheetModal: replace its hardcoded hex StyleSheet with `useTheme()` colors (backdrop stays rgba black).
- **Depends on:** C1
- **Verify:** render a test row of primitives on the profile screen temporarily, both themes; then remove.
- **Risk:** none until adopted.

### [C3] Migrate the 23 hardcoded-palette screens to useTheme
- **Type:** `frontend-blind`
- **File(s), in migration order (money screens first):**
  1. mobile/app/ai-chat.tsx
  2. mobile/app/quotes/[id].tsx
  3. mobile/app/quotes/create.tsx
  4. mobile/app/invoices/[id].tsx
  5. mobile/app/invoices/create.tsx
  6. mobile/app/jobs/[id].tsx
  7. mobile/app/jobs/create.tsx
  8. mobile/app/jobs/complete.tsx
  9. mobile/app/jobs/list.tsx
  10. mobile/app/customers/index.tsx
  11. mobile/app/customers/[id].tsx
  12. mobile/app/customers/new.tsx
  13. mobile/app/customers/compose.tsx
  14. mobile/app/customers/messages.tsx
  15. mobile/app/receipts/index.tsx
  16. mobile/app/receipts/scan.tsx
  17. mobile/app/price-book.tsx
  18. mobile/app/(auth)/login.tsx
  19. mobile/app/(auth)/register.tsx
  20. mobile/app/(auth)/forgot-password.tsx
  21. mobile/app/settings/bank.tsx
  22. mobile/app/settings/payment-terms.tsx
  23. mobile/app/settings/widgets.tsx
- **Mechanical recipe per file:** delete the module-level color constants block (`const ORANGE = ...` etc.); add `const { colors: c } = useTheme();` in the component; convert `StyleSheet.create` at module scope to `const makeStyles = (c: Colors) => StyleSheet.create({...})` and call via `const s = useMemo(() => makeStyles(c), [c]);` (import `useMemo`; import `type Colors` from '@/hooks/use-theme'). Mapping: ORANGE→c.orange, ORANGE_DEEP→c.orangeDeep, ORANGE_SOFT→c.orangeSoft, INK→c.ink, PAPER→c.paper, PAPER_DEEP→c.paperDeep, CARD→c.card, MUTED→c.muted, MUTED_HI→c.mutedHi, LINE_SOFT→c.lineSoft, LINE_MID→c.lineSoft (theme has no lineMid — add `lineMid` to Colors in use-theme.ts: light `rgba(26,14,6,0.14)`, dark `rgba(242,244,247,0.16)`), GREEN→c.green, GREEN_SOFT→c.greenSoft, RED→c.red, RED_SOFT→c.redSoft, BLACK→c.ink, BLUE/BLUE_SOFT/BLUE_BORDER→add `blue`/`blueSoft`/`blueBorder` to Colors (light: `#1f6feb`/`#eaf2ff`/`#c8dcff`; dark: `#6ea8ff`/`rgba(110,168,255,0.14)`/`rgba(110,168,255,0.35)`).
  Hardcoded `'#fff'` text on orange/ink buttons stays literal. One commit per 3–4 files; run the app between commits.
- **Depends on:** C1 (extends Colors first)
- **Verify:** toggle dark mode in profile → every migrated screen is dark; no white flashes navigating tabs↔stack.
- **Risk:** MEDIUM (wide mechanical churn) — mitigated by per-file commits and the recipe.

---

## SECTION 4 — Batch D (per-screen UX/perf pass)

Order within: crashes/data first, then hit-targets/legibility, then perf. All type `frontend-blind` unless tagged.

### [D1] (tabs)/quotes.tsx
- FlatList migration: anchor `filtered.map((q` — replace ScrollView+map with `<FlatList data={filtered} keyExtractor={q => String(q.id)} renderItem=... />`; extract the card into a `React.memo` row; move `parseTitle`'s `JSON.parse` into `useMemo` keyed on `quotes` (parse once per quote, not per keystroke).
- Error state: anchor `const quotes = ...isError` coercion — when `isError`, render a red retry banner (copy the Batch-A pattern from customers/index.tsx) instead of the "No quotes yet" empty state.
- Pull-to-refresh: anchor `queryClient.invalidateQueries()` (bare) → `queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] })`.
- **Verify:** 200-quote seed scrolls smoothly; airplane mode → banner not empty-state.

### [D2] (tabs)/invoices.tsx
- FlatList (same recipe; anchor the `.map(` over sorted/filtered invoices).
- `makeStyles(c)` + `STATUS_PILL` rebuilt per render — wrap both in `useMemo(..., [c])`.
- 9px column/legend text → tokens `small` (12). Replace 🔴 emoji legend with a colored dot `<View style={{width:8,height:8,borderRadius:4,backgroundColor:c.red}}/>`.
- Header title "$ getting paid" → "Invoices" (`needs-my-decision` if you want to keep the voice).
- **Verify:** list scrolls smoothly; legend readable in dark mode.

### [D3] (tabs)/calendar.tsx
- Same-time job collision: anchor the absolute-position math in the day grid (search `position: 'absolute'` within the jobs render) — group jobs by start slot; when n>1 render side-by-side with `width: 100/n %` and `left: i*100/n %`.
- Pull-to-refresh: add `RefreshControl` to the main ScrollView refetching `[api.jobs.list.path]`.
- Week chevrons 32×32 → 44×44 (anchor `width: 32` in chevron styles); search-clear X: add `hitSlop={{top:12,bottom:12,left:12,right:12}}`.
- `now = new Date()` frozen per render: `const [now, setNow] = useState(() => new Date());` + `useEffect` interval `setNow(new Date())` every 60s.
- `weekOffset` AsyncStorage write-only persistence: either read it back on mount or delete the write. Recommend delete (fresh week on open is correct for a calendar).
- Memoize `outOfRangeBefore/After` filters + day-strip `format()` calls with `useMemo([jobs, weekOffset])`.
- **Verify:** two jobs at 9:00 both visible/tappable; red now-line moves after a minute.

### [D4] jobs/list.tsx
- Overdue bucket: anchor `const pastJobs = useMemo(` — past-dated *incomplete* jobs currently vanish from Upcoming AND Past. Add to the `upcoming` filter an OR-branch: `(isPast(new Date(j.scheduledDate)) && j.status !== 'completed' && j.status !== 'cancelled')` and render those rows with an "Overdue" tag, or add a fourth filter chip. Recommend: include in Today/Upcoming with red accent.
- FlatList migration (anchor the jobs `.map(`).
- 9px `timeColSub` → 11.
- **Verify:** a yesterday-dated scheduled job appears with overdue styling.

### [D5] jobs/[id].tsx
- Overflow `...` menu is a dead button: anchor `<TouchableOpacity style={s.moreBtn} activeOpacity={0.7}>` — wire to `ActionSheetModal` with: Reschedule (→ `needs-my-decision`: reuse `/jobs/create?editId=` requires an edit mode that doesn't exist; minimal viable = "Cancel job" (PATCH status cancelled via useUpdateJob) + "Delete job" ⚠️UNVERIFIED no DELETE /api/jobs route exists — check server/routes.ts; if absent, backend decision).
- Phone/SMS `iconAction` 36×36 → 44×44.
- Remove unused `Platform` import.
- accessibilityLabel on back/more/phone/sms/navigate buttons.
- **Verify:** … opens sheet; Cancel job flips status badge (B2 makes it live-update).

### [D6] jobs/create.tsx
- Unsaved-changes guard: copy the `beforeRemove` block from invoices/create.tsx (anchor there: `navigation.addListener('beforeRemove'`) adapting `hasWork = title.trim() || address.trim() || notes.trim() || customerId !== null`.
- Customer picker dead-end: below the dropdown results add a row "＋ New customer" → `router.push('/customers/new')`. ⚠️ returning doesn't auto-select; acceptable v1.
- 9px `dayChipTop` → 10 minimum (it's uppercase-tracked; 10 acceptable) — or 11 if it fits.
- **Verify:** back-swipe with a title typed → confirm dialog.

### [D7] invoices/[id].tsx
- BSB/account `copyRow` rows: anchor `style={s.copyRow}` — set `minHeight: 44` on the style + `hitSlop` on the copy icon.
- Title triple-source: anchor `parsedItems[0]?.description` fallback chain — standardize display title to `invoice?.title || parsedItems[0]?.description || `Invoice ${num}`` and use the same expression for list, detail, PDF (list uses `inv.title` already; make detail match).
- accessibilityLabels on header buttons.
- **Verify:** copy BSB with a thumb; same name in list/detail/PDF.

### [D8] invoices/create.tsx
- Line-item remove button 32×32 (anchor `removeBtn`) → 44 min with hitSlop.
- 9px column headers (anchor the Description/Qty/Unit price header row styles) → 11.
- **Verify:** visual.

### [D9] ai-chat.tsx (beyond Section 1 fixes)
- Memoize: `filteredCustomers` is already computed each render — wrap in `useMemo([customers, custSearch])`; hoist the two IIFE `editableItems.reduce(...)` totals into one `useMemo` consumed by slider + totals + send.
- File split (`needs-my-decision` — high-touch): extract `PromptStep` and `DraftStep` components + a `useAiQuoteForm` hook. Only do this after C3 migration of the file, never same commit.
- Haptics on web: `Haptics.selectionAsync()` etc. called unguarded in several handlers here (and expiry chips) — wrap the module: create `lib/haptics.ts` exporting no-op-on-web versions; find-replace `Haptics.` → `haptics.` in this file.
- **Verify:** typing in line-item rate doesn't lag with 10 items.

### [D10] receipts/scan.tsx + receipts/index.tsx
- Silent scan failure: anchor `// Scan failed — go to review with empty fields` — set a `scanFailed` state and render a visible amber banner on the review step: "Couldn't read the receipt — details below are blank, enter them manually."
- Date free-text: on save, validate `date` with `isNaN(new Date(date).getTime())` → inline error; placeholder "2026-07-06".
- Receipt detail/edit screen (`needs-my-decision`): new route receipts/[id].tsx with editable fields + PATCH ⚠️UNVERIFIED whether PATCH /api/receipts/:id exists — check server/routes.ts; if absent it's a backend add.
- Receipt image never stored (`needs-my-decision`, backend: needs storage/upload endpoint).
- **Verify:** scan a blurry photo → banner appears.

### [D11] price-book.tsx
- Units dedupe: anchor `const UNITS` (module, 9 units incl 'roll') vs the hardcoded 8-unit array inside `ItemForm` (search `'ea', 'm', 'm2'` or similar inside the form) — make ItemForm consume the module `UNITS`.
- FlatList for the item list (anchor the nested `.map(` over categories/items) — use SectionList keyed by category.
- **Verify:** 'roll' selectable in add form.

### [D12] (tabs)/index.tsx (home)
- "See all →" links: anchor `See all` — wrap targets in 44px-min TouchableOpacity + hitSlop.
- CyclingPill: replace tap-to-advance/long-press-lock mystery with a static two-line stack, or page-dots — `needs-my-decision` (visual identity call). Minimal: add `accessibilityLabel` + increase text 12→13 and keep.
- AnimatedNumber setInterval ticker: replace with plain `<Text>` rendering the final value (counting animation isn't worth the JS-thread churn) — or Reanimated if you want to keep it. Recommend plain text.
- Hero Navigate/SMS buttons render enabled with no data: disable style (`opacity: 0.4`) + showAlert explaining what's missing (mirror jobs/[id] handlers).
- `nextJob` memo deps: anchor `}, [allJobs, todayJobs]);` on the nextJob useMemo — include the D3-style ticking `now` state or compute cutoff inside with fresh `new Date()` each evaluation and add a re-render source.
- Dark-mode chips: anchor `BLUE_SOFT` / `#c8dcff` usages → theme `c.blueSoft/c.blueBorder` (after C3 adds them).
- makeStyles per render → `useMemo([c, isDark])`.
- **Verify:** home scroll + refresh smooth on Android emulator; chips legible dark.

### [D13] (tabs)/profile.tsx
- `SettingsGroup` re-creates its StyleSheet per group per render — hoist `makeStyles` result via `useMemo([c])` at the screen level and pass down, or module-scope the makeStyles call per theme with a tiny cache.
- Subscription/plan copy now generic (Batch A); wire real plan data when subscription state exists (`needs-my-decision`, backend).
- **Verify:** profile scroll smooth.

### [D14] toast() is a blocking modal
- **File(s):** mobile/lib/toast.ts + NEW mobile/components/Snackbar.tsx
- **Current:** Every mutation success interrupts with an OK-dismiss alert (web: thread-blocking window.alert).
- **Target:** non-blocking snackbar: module-level event emitter in toast.ts (`let listener; export function toast(t){ listener?.(t); }` with 3s auto-dismiss), `<Snackbar/>` host mounted once in _layout.tsx above the Stack, themed, `accessibilityLiveRegion="polite"`. Keep `showAlert/showConfirm` (lib/dialogs) for genuinely blocking confirms.
- **Depends on:** C1/C2.
- **Verify:** create invoice → bottom snackbar slides up, auto-dismisses, no tap required.
- **Risk:** app-wide UX change (better, but visible).

### [D15] Boot color flash
- **File(s):** mobile/app/_layout.tsx · mobile/app.json
- **Anchor:** `return <View style={{ flex: 1, backgroundColor: '#0F0905' }} />;`
- **Target:** use `#0D0E11` (matches app.json splash `backgroundColor`) so splash→gate is seamless; the gate→paper transition remains (theme-dependent, acceptable).
- **Verify:** cold start shows one dark shade until first paint.

### [D16] Accessibility sweep (after C2/C3)
- Every icon-only TouchableOpacity not yet converted to `IconButton`: add `accessibilityRole="button"` + `accessibilityLabel`. Grep to enumerate: `grep -rn "TouchableOpacity" mobile/app --include="*.tsx" | grep -v accessibilityLabel` then filter to icon-only ones manually per file (back chevrons, +, …, ×, phone, sms, copy, trash).
- MUTED text at ≤12px used for load-bearing info (labels above money inputs): bump to `small` (12) with `c.mutedHi` (0.72 opacity) instead of `c.muted` (0.55) — do per-screen during D passes, not as a blind find-replace.
- **Verify:** iOS VoiceOver / Android TalkBack reads names for all controls on quotes list + detail.

---

## Sequencing summary
P0-1 → F1–F8 (skip F9–F12 pending decisions) → B1–B6 → C1 → C2 → C3 (per-file commits) → D1–D16.
Decisions owed by you: F1 (backend half), F9, F10, F11, F12, B5, D2 title copy, D5 job delete/reschedule scope, D9 file split, D10 receipt detail + image storage, D12 CyclingPill, D13 plan data.
