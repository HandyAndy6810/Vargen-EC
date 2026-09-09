import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Share } from 'react-native';
import { router, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { addDays, format } from 'date-fns';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { showAlert } from '@/lib/dialogs';
import { buildQuotePDF } from '@/lib/quote-pdf';
import { hapticSuccess, hapticError, hapticPress, hapticWarn } from '@/lib/haptics';
import { loadQuoteDraft, saveQuoteDraft, clearQuoteDraft, type CachedQuoteDraft } from '@/lib/quote-draft-cache';
import { unitSell, type LineItem } from '@/hooks/use-quote-draft';
import { useQuote } from '@/hooks/use-quotes';
import { useJob } from '@/hooks/use-jobs';
import { useCustomers, useCustomer } from '@/hooks/use-customers';
import { useInvoices, useInvoice } from '@/hooks/use-invoices';
import { useSettings } from '@/hooks/use-settings';
import { parseQuoteContent } from '@shared/mobile-types';
import type { SheetAction } from '@/components/ActionSheetModal';

const round2 = (n: number) => Math.round(n * 100) / 100;
const DEFAULT_LINES: LineItem[] = [{ name: '', qty: '1', price: '' }];

export type InvoiceType = 'full' | 'deposit' | 'balance';

/** What changed between the accepted quote and the invoice about to go out. */
export type VarianceRow = { label: string; quoted: number; invoiced: number; delta: number };

/**
 * The invoice equivalent of the quote draft, deliberately built to the same shape so
 * the two flows behave identically where they can. Line items, the markup engine,
 * autosave, the PDF payload and the share sheet are all the quote flow's, reused
 * rather than reimplemented.
 *
 * Where invoices genuinely differ:
 *  - they usually START from an accepted quote rather than a description
 *  - they carry a DUE DATE, which a quote doesn't
 *  - markup is hidden once the price has been agreed with the customer
 *  - there's a variance view against the quote they came from
 */
type InvoiceDraft = {
  isEditing: boolean;
  editId: number;

  // where it came from
  sourceQuoteId: number;
  setSourceQuoteId: (id: number) => void;
  /** True once a quote's contents have been pulled in — the price is then agreed. */
  fromQuote: boolean;
  quoteTotal: number;
  loadFromQuote: (quoteId: number) => Promise<boolean>;
  /** Line-by-line difference against the quote, empty when not built from one. */
  variance: VarianceRow[];
  varianceTotal: number;

  // deposit / balance
  invoiceType: InvoiceType; setInvoiceType: (t: InvoiceType) => void;
  depositPercent: number; setDepositPercent: (p: number) => void;
  /** A dollar figure instead of a percentage. Takes precedence when set. */
  depositAmount: string; setDepositAmount: (v: string) => void;
  priorInvoiced: number;

  // fields
  customer: string; setCustomer: (v: string) => void;
  customerId: number | null; setCustomerId: (v: number | null) => void;
  selectedCustomer: any;
  jobTitle: string; setJobTitle: (v: string) => void;
  summary: string; setSummary: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  lines: LineItem[]; setLines: React.Dispatch<React.SetStateAction<LineItem[]>>;
  filteredCustomers: any[];

  // due date — the field a quote has no equivalent of
  paymentTermsDays: number; setPaymentTermsDays: (d: number) => void;
  dueDate: Date; setDueDate: (d: Date) => void;
  dueDateLabel: string;

  // markup engine (hidden in the UI once built from a quote)
  markupPct: number; setMarkupPct: (v: number) => void;
  toggleLineLock: (i: number) => void;
  roundUp: boolean; setRoundUp: (v: boolean) => void;
  upsertLine: (index: number | null, line: LineItem) => void;
  removeLine: (index: number) => void;
  startManual: () => void;

  // draft restore
  restorable: CachedQuoteDraft | null;
  restoreDraft: () => CachedQuoteDraft | null;
  forgetSavedDraft: () => void;

  // totals — `total` is what THIS invoice bills, `jobTotal` the whole job, so a
  // deposit can say what it is taking now and what is left for later.
  subtotal: number; gst: number; total: number; totalCost: number; profit: number;
  jobTotal: number; remainingAfter: number;

  // documents
  invoicePayload: () => any;
  shareAnyway: () => Promise<void>;

  // save + send
  error: string | null; setError: (v: string | null) => void;
  saving: boolean;
  save: (status: 'draft' | 'sent') => void;
  hasWork: () => boolean;
  showSendSheet: boolean; setShowSendSheet: (v: boolean) => void;
  handleSendPress: () => void;
  sendActions: SheetAction[];

  // AI
  aiBusy: boolean;
  generateFromDescription: (description: string) => Promise<{ ok: boolean }>;
};

const Ctx = createContext<InvoiceDraft | null>(null);

export function useInvoiceDraft(): InvoiceDraft {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInvoiceDraft must be used inside InvoiceDraftProvider');
  return v;
}

export function InvoiceDraftProvider({ children }: { children: ReactNode }) {
  // Read both, for the same reason the quote flow does: this runs in the route
  // group's layout, and useLocalSearchParams is scoped to the layout's own segment,
  // so a query string on the child route never reaches it.
  type EntryParams = { quoteId?: string; jobId?: string; invoiceId?: string };
  const localParams = useLocalSearchParams<EntryParams>();
  const globalParams = useGlobalSearchParams<EntryParams>();
  const initial = useRef({
    quoteId: Number(localParams.quoteId ?? globalParams.quoteId ?? 0) || 0,
    jobId: Number(localParams.jobId ?? globalParams.jobId ?? 0) || 0,
    editId: Number(localParams.invoiceId ?? globalParams.invoiceId ?? 0) || 0,
  });
  const editId = initial.current.editId;
  const isEditing = editId > 0;

  const { data: allCustomers } = useCustomers() as any;
  const { data: settings } = useSettings() as any;

  const [sourceQuoteId, setSourceQuoteId] = useState(initial.current.quoteId);
  const [fromQuote, setFromQuote] = useState(false);
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [quotedLines, setQuotedLines] = useState<LineItem[]>([]);

  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const selectedCustomer = (allCustomers as any[])?.find((x: any) => x.id === customerId);
  const [jobTitle, setJobTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>(DEFAULT_LINES);
  const [markupPct, setMarkupPct] = useState(30);
  const [roundUp, setRoundUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('full');
  const [depositPercent, setDepositPercent] = useState(50);
  // Some deposits are agreed as a round figure rather than a share of the job
  // ("$500 up front"), so both ways in are offered. A dollar amount wins when set.
  const [depositAmount, setDepositAmount] = useState('');

  // ── Due date ───────────────────────────────────────────────────────────────
  // The create flow never set one, so every invoice went out with no due date and
  // the overdue filter could never match anything. It defaults from settings and is
  // editable per invoice.
  const settingsTerms = Number(settings?.paymentTermsDays ?? 14) || 14;
  const [paymentTermsDays, setPaymentTermsDaysState] = useState(settingsTerms);
  const [dueDate, setDueDate] = useState<Date>(() => addDays(new Date(), settingsTerms));
  const seededTerms = useRef(false);
  useEffect(() => {
    if (seededTerms.current || isEditing) return;
    if (settings?.paymentTermsDays) {
      const d = Number(settings.paymentTermsDays) || 14;
      setPaymentTermsDaysState(d);
      setDueDate(addDays(new Date(), d));
      seededTerms.current = true;
    }
  }, [settings, isEditing]);
  const setPaymentTermsDays = (d: number) => {
    setPaymentTermsDaysState(d);
    setDueDate(addDays(new Date(), d));
  };
  const dueDateLabel = format(dueDate, 'EEE d MMM yyyy');

  const [custSearch] = useState('');
  const filteredCustomers = useMemo(() => {
    const list: any[] = allCustomers || [];
    if (!custSearch.trim()) return list.slice(0, 8);
    return list.filter((x: any) => x.name?.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 8);
  }, [allCustomers, custSearch]);

  // ── Prior invoicing on the same quote ──────────────────────────────────────
  const { data: allInvoices } = useInvoices();
  const priorInvoiced = useMemo(() => {
    if (!sourceQuoteId) return 0;
    return ((allInvoices as any[]) || [])
      .filter((i: any) => i.quoteId === sourceQuoteId && i.id !== editId)
      .reduce((s: number, i: any) => s + (Number(i.totalAmount) || 0), 0);
  }, [allInvoices, sourceQuoteId, editId]);
  useEffect(() => {
    if (priorInvoiced > 0 && invoiceType === 'full') setInvoiceType('balance');
  }, [priorInvoiced, invoiceType]);

  // ── Pull a quote's contents in ─────────────────────────────────────────────
  const { data: entryQuote } = useQuote(initial.current.quoteId) as any;
  const { data: sourceJob } = useJob(initial.current.jobId) as any;
  const { data: sourceJobCustomer } = useCustomer(sourceJob?.customerId || 0) as any;

  const applyQuote = (quote: any): boolean => {
    if (!quote) return false;
    const content: any = parseQuoteContent(quote.content);
    const src: any[] = content.lines?.length ? content.lines : (content.items || []);
    const mapped: LineItem[] = src.map((l: any) => ({
      name: l.name ?? l.description ?? '',
      qty: String(l.qty ?? l.quantity ?? 1),
      price: String(l.price ?? l.unitPrice ?? ''),
      unit: l.unit,
      cost: l.cost ?? (l.unitCost != null ? String(l.unitCost) : undefined),
      category: l.category,
      // A quoted price is agreed with the customer. Every line comes across locked
      // so the markup slider can't quietly move a number they've already accepted.
      markupLocked: true,
      lockedPrice: String(l.price ?? l.unitPrice ?? ''),
    }));
    if (!mapped.length) return false;
    setLines(mapped);
    setQuotedLines(mapped.map(l => ({ ...l })));
    setJobTitle(content.jobTitle || '');
    setSummary((content as any).summary || '');
    setNotes(content.notes || '');
    if (content.customerName) setCustomer(content.customerName);
    if (quote.customerId) setCustomerId(quote.customerId);
    if (typeof (content as any).markupPct === 'number') setMarkupPct((content as any).markupPct);
    setQuoteTotal(Number(quote.totalAmount) || 0);
    setSourceQuoteId(Number(quote.id) || 0);
    setFromQuote(true);
    return true;
  };

  // ── Editing an existing invoice ────────────────────────────────────────────
  // Without this the edit route opened a blank invoice, exactly the way Tweak used
  // to open a blank quote.
  const { data: editInvoice } = useInvoice(editId) as any;
  const appliedEditInvoice = useRef(false);
  useEffect(() => {
    if (!isEditing || appliedEditInvoice.current || !editInvoice) return;
    appliedEditInvoice.current = true;

    let saved: any[] = [];
    try {
      saved = typeof editInvoice.items === 'string' ? JSON.parse(editInvoice.items) : (editInvoice.items || []);
    } catch { saved = []; }
    if (saved.length) {
      setLines(saved.map((it: any) => ({
        name: it.description || '',
        qty: String(it.quantity ?? 1),
        price: String(it.unitPrice ?? 0),
        unit: it.unit,
        // A saved invoice records what was charged, not what it cost, so every line
        // is pinned — the slider must not reprice work already billed.
        markupLocked: true,
        lockedPrice: String(it.unitPrice ?? 0),
      })));
    }
    if (editInvoice.customerId) setCustomerId(editInvoice.customerId);
    if (editInvoice.customerName) setCustomer(editInvoice.customerName);
    if (editInvoice.dueDate) setDueDate(new Date(editInvoice.dueDate));
    if (editInvoice.quoteId) { setSourceQuoteId(editInvoice.quoteId); setFromQuote(true); }
    if (editInvoice.invoiceType) setInvoiceType(editInvoice.invoiceType);
    // The notes field carries "Job: <title>" on the first line, then the summary.
    const noteLines = String(editInvoice.notes || '').split('\n');
    const titleLine = noteLines.find((l: string) => l.startsWith('Job: '));
    if (titleLine) setJobTitle(titleLine.slice(5).trim());
    const rest = noteLines.filter((l: string) => !l.startsWith('Job: ')).join('\n').trim();
    if (rest) setSummary(rest);
  }, [editInvoice, isEditing]);

  const appliedEntryQuote = useRef(false);
  useEffect(() => {
    if (appliedEntryQuote.current || !entryQuote) return;
    appliedEntryQuote.current = true;
    applyQuote(entryQuote);
  }, [entryQuote]);

  /** Fetch a quote by id and fold it in. Used by the "choose from a quote" path. */
  const loadFromQuote = async (quoteId: number): Promise<boolean> => {
    try {
      const res = await apiRequest('GET', `/api/quotes/${quoteId}`);
      if (!res.ok) throw new Error('Could not load that quote.');
      const quote = await res.json();
      const ok = applyQuote(quote);
      if (!ok) setError("That quote has no line items to invoice.");
      else hapticPress();
      return ok;
    } catch (e: any) {
      hapticError();
      setError(e?.message || 'Could not load that quote.');
      return false;
    }
  };

  // Prefill from a finished job
  const jobPrefilled = useRef(false);
  useEffect(() => {
    if (!sourceJob || jobPrefilled.current) return;
    jobPrefilled.current = true;
    if (sourceJob.title) setJobTitle(prev => prev || sourceJob.title);
    if (sourceJob.description) setSummary(prev => prev || sourceJob.description);
  }, [sourceJob]);
  useEffect(() => {
    if (sourceJobCustomer?.name) {
      setCustomer(prev => prev || sourceJobCustomer.name);
      setCustomerId(prev => prev ?? sourceJobCustomer.id);
    }
  }, [sourceJobCustomer]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const rawSubtotal = round2(lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * unitSell(l, markupPct), 0));
  const rawTotal = round2(rawSubtotal * 1.1);
  const fullTotal = roundUp ? Math.ceil(rawTotal) : rawTotal;
  // A deposit invoice bills a slice now; a balance invoice bills what's left after
  // everything already invoiced against the same quote.
  const depositFixed = parseFloat(depositAmount) || 0;
  const total = invoiceType === 'deposit'
    ? (depositFixed > 0
        ? round2(Math.min(depositFixed, fullTotal))
        : round2(fullTotal * (depositPercent / 100)))
    : invoiceType === 'balance'
      ? round2(Math.max(0, fullTotal - priorInvoiced))
      : fullTotal;
  const subtotal = round2(total / 1.1);
  const gst = round2(total - subtotal);
  const jobTotal = round2(fullTotal);
  const remainingAfter = round2(Math.max(0, jobTotal - priorInvoiced - total));
  const totalCost = round2(lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.cost || '0') || 0), 0));
  const profit = round2(subtotal - totalCost);

  // ── Variance against the quote ─────────────────────────────────────────────
  const variance = useMemo<VarianceRow[]>(() => {
    if (!fromQuote || !quotedLines.length) return [];
    const key = (l: LineItem) => l.name.trim().toLowerCase();
    const quotedBy = new Map<string, number>();
    quotedLines.forEach(l => {
      quotedBy.set(key(l), (quotedBy.get(key(l)) || 0) + (parseFloat(l.qty) || 0) * unitSell(l, markupPct));
    });
    const rows: VarianceRow[] = [];
    const seen = new Set<string>();
    lines.forEach(l => {
      const k = key(l);
      if (!k) return;
      seen.add(k);
      const invoiced = round2((parseFloat(l.qty) || 0) * unitSell(l, markupPct));
      const quoted = round2(quotedBy.get(k) || 0);
      if (round2(invoiced - quoted) !== 0) {
        rows.push({ label: l.name.trim(), quoted, invoiced, delta: round2(invoiced - quoted) });
      }
    });
    // Anything quoted that isn't on the invoice at all
    quotedLines.forEach(l => {
      const k = key(l);
      if (!k || seen.has(k)) return;
      const quoted = round2((parseFloat(l.qty) || 0) * unitSell(l, markupPct));
      rows.push({ label: l.name.trim(), quoted, invoiced: 0, delta: round2(-quoted) });
    });
    return rows;
  }, [fromQuote, quotedLines, lines, markupPct]);
  const varianceTotal = useMemo(() => round2(variance.reduce((s, r) => s + r.delta, 0)), [variance]);

  // ── Line editing ───────────────────────────────────────────────────────────
  const toggleLineLock = (i: number) => {
    hapticPress();
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      if (l.markupLocked) {
        const { markupLocked, lockedPrice, ...rest } = l;
        return { ...rest, markupLocked: false, lockedPrice: undefined };
      }
      const frozen = unitSell(l, markupPct);
      return { ...l, markupLocked: true, lockedPrice: String(frozen), price: String(frozen) };
    }));
  };
  const upsertLine = (index: number | null, line: LineItem) => {
    setLines(prev => (index === null ? [...prev, line] : prev.map((l, i) => (i === index ? line : l))));
  };
  const removeLine = (index: number) => {
    hapticWarn();
    setLines(prev => prev.filter((_, i) => i !== index));
  };
  const startManual = () => setLines([{ name: '', qty: '1', price: '', cost: '', category: 'material' }]);

  // ── Draft autosave / restore ───────────────────────────────────────────────
  const [restorable, setRestorable] = useState<CachedQuoteDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const hasWork = () =>
    !!(customer.trim() || jobTitle.trim() || summary.trim() || notes.trim() ||
      lines.some(l => l.name.trim() || l.price.trim()));

  useEffect(() => {
    if (isEditing) { setHydrated(true); return; }
    let alive = true;
    loadQuoteDraft('invoice').then(found => {
      if (!alive) return;
      if (found) setRestorable(found);
      setHydrated(true);
    });
    return () => { alive = false; };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !hydrated || !hasWork()) return;
    const t = setTimeout(() => {
      saveQuoteDraft({
        customer, customerId, jobTitle, summary, schedDate: '',
        expiryDate: '', notes, lines, markupPct, assumptions: [], roundUp,
        quoteId: sourceQuoteId || undefined,
        dueDateISO: dueDate.toISOString(),
        paymentTermsDays,
      }, 'invoice');
    }, 800);
    return () => clearTimeout(t);
  }, [
    isEditing, hydrated, customer, customerId, jobTitle, summary, notes, lines,
    markupPct, roundUp, sourceQuoteId, dueDate, paymentTermsDays,
  ]);

  const restoreDraft = (): CachedQuoteDraft | null => {
    const r = restorable;
    if (!r) return null;
    setCustomer(r.customer || '');
    setCustomerId(r.customerId ?? null);
    setJobTitle(r.jobTitle || '');
    setSummary(r.summary || '');
    setNotes(r.notes || '');
    setLines(r.lines?.length ? r.lines : DEFAULT_LINES);
    if (typeof r.markupPct === 'number') setMarkupPct(r.markupPct);
    setRoundUp(!!r.roundUp);
    if (r.quoteId) { setSourceQuoteId(r.quoteId); setFromQuote(true); }
    if (r.dueDateISO) setDueDate(new Date(r.dueDateISO));
    if (r.paymentTermsDays) { setPaymentTermsDaysState(r.paymentTermsDays); seededTerms.current = true; }
    setRestorable(null);
    return r;
  };
  const forgetSavedDraft = () => { setRestorable(null); clearQuoteDraft('invoice'); };

  // ── Documents ──────────────────────────────────────────────────────────────
  const invoicePayload = () => ({
    documentType: 'invoice' as const,
    documentNumber: isEditing ? `INV-${String(editId).padStart(4, '0')}` : 'DRAFT',
    createdAt: format(new Date(), 'd MMM yyyy'),
    dueDate: dueDateLabel,
    status: 'draft' as const,
    jobTitle: jobTitle || 'Untitled invoice',
    summary: summary || undefined,
    customerName: customer.trim() || undefined,
    customerPhone: selectedCustomer?.phone || undefined,
    customerEmail: selectedCustomer?.email || undefined,
    customerAddress: selectedCustomer?.address || undefined,
    items: lines
      .filter(l => l.name.trim() || unitSell(l, markupPct) > 0)
      .map(l => ({
        description: l.name || 'Item',
        quantity: parseFloat(l.qty) || 1,
        unit: l.unit || undefined,
        unitPrice: unitSell(l, markupPct),
      })),
    notes: notes || undefined,
    subtotal, gstAmount: gst, totalAmount: total, includeGST: true,
  });

  const shareAnyway = async () => {
    try {
      const html = buildQuotePDF(invoicePayload(), settings);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        showAlert('Sharing unavailable', "This device can't open the share sheet.");
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/cancel|dismiss/i.test(msg)) return;
      hapticError();
      showAlert('Could not share the invoice', msg || 'Try again.');
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!jobTitle.trim()) { setError('Give the invoice a job title'); return false; }
    if (!lines.some(l => l.name.trim() && unitSell(l, markupPct) > 0)) {
      setError('Add at least one line item with a price');
      return false;
    }
    setError(null);
    return true;
  };

  const save = async (status: 'draft' | 'sent') => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const body: any = {
        customerId: customerId ?? undefined,
        customerName: customer.trim() || undefined,
        items: lines
          .filter(l => l.name.trim() && unitSell(l, markupPct) > 0)
          .map(l => ({
            description: l.name.trim(),
            quantity: parseFloat(l.qty) || 1,
            unit: l.unit || 'each',
            unitPrice: unitSell(l, markupPct),
          })),
        notes: [jobTitle.trim() ? `Job: ${jobTitle.trim()}` : '', summary.trim(), notes.trim()]
          .filter(Boolean).join('\n') || undefined,
        includeGST: true,
        status,
        // Previously omitted entirely, which left every invoice with no due date and
        // made the overdue filter permanently empty.
        dueDate: dueDate.toISOString(),
        quoteId: sourceQuoteId || undefined,
        invoiceType,
        ...(invoiceType === 'deposit'
          ? (depositFixed > 0 ? { depositAmount: depositFixed } : { depositPercent })
          : {}),
      };
      const res = isEditing
        ? await apiRequest('PATCH', `/api/invoices/${editId}`, body)
        : await apiRequest('POST', '/api/invoices', body);
      if (!res.ok) {
        const detail = await res.json().catch(() => ({} as any));
        throw new Error(detail?.message || 'Could not save the invoice.');
      }
      const saved = await res.json();
      hapticSuccess();
      clearQuoteDraft('invoice');
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      try { router.dismissAll(); } catch {}
      router.replace(`/invoices/${saved?.id ?? editId}` as any);
    } catch (e: any) {
      hapticError();
      setError(e?.message || 'Could not save the invoice.');
    } finally {
      setSaving(false);
    }
  };

  const [showSendSheet, setShowSendSheet] = useState(false);
  const handleSendPress = () => { if (validate()) setShowSendSheet(true); };
  const sendVia = (open: () => void) => { save('sent'); open(); };
  const sendActions: SheetAction[] = [
    selectedCustomer?.email ? {
      label: 'Email customer',
      onPress: () => sendVia(() =>
        Linking.openURL(`mailto:${selectedCustomer.email}?subject=Your invoice&body=Hi ${customer || 'there'},%0D%0A%0D%0APlease find your invoice attached.%0D%0A%0D%0ATotal: $${total.toFixed(2)} inc. GST%0D%0ADue: ${dueDateLabel}%0D%0A%0D%0AThanks`)
      ),
    } : null,
    selectedCustomer?.phone ? {
      label: 'Send SMS',
      onPress: () => sendVia(() => Linking.openURL(`sms:${selectedCustomer.phone}`)),
    } : null,
    {
      label: 'Share link',
      onPress: () => sendVia(() => Share.share({ message: `Invoice — $${total.toFixed(2)} (inc. GST), due ${dueDateLabel}` })),
    },
  ].filter(Boolean) as SheetAction[];

  // ── AI ─────────────────────────────────────────────────────────────────────
  const generateFromDescription = async (description: string): Promise<{ ok: boolean }> => {
    setAiBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quotes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description,
          customerName: customer.trim() || undefined,
          tradeType: settings?.tradeType || undefined,
          labourRate: typeof settings?.labourRate === 'number' ? settings.labourRate : undefined,
          markupPercent: typeof settings?.markupPercent === 'number' ? settings.markupPercent : undefined,
          callOutFee: typeof settings?.callOutFee === 'number' ? settings.callOutFee : undefined,
          includeGST: settings?.includeGST !== false,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(res.status === 401 ? 'Please sign in to use AI.' : (body?.message || 'AI could not build the invoice — try again.'));
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) throw new Error("AI didn't return any line items.");
      setLines(items.map((it: any) => ({
        name: it.description || '',
        qty: String(it.quantity || 1),
        price: String(it.unitPrice || 0),
        unit: it.unit || 'ea',
        cost: it.unitCost != null ? String(it.unitCost) : undefined,
        category: String(it.category || '').toLowerCase() === 'labour' ? 'labour' : 'material',
      })));
      if (data.jobTitle) setJobTitle(String(data.jobTitle));
      if (data.summary) setSummary(String(data.summary));
      else if (description.trim()) setSummary(description.trim());
      if (data.notes) setNotes(String(data.notes));
      return { ok: true };
    } catch (e: any) {
      hapticError();
      setError(e?.message || 'Something went wrong.');
      return { ok: false };
    } finally {
      setAiBusy(false);
    }
  };

  const value: InvoiceDraft = {
    isEditing, editId,
    sourceQuoteId, setSourceQuoteId, fromQuote, quoteTotal, loadFromQuote, variance, varianceTotal,
    invoiceType, setInvoiceType, depositPercent, setDepositPercent,
    depositAmount, setDepositAmount, priorInvoiced,
    customer, setCustomer, customerId, setCustomerId, selectedCustomer,
    jobTitle, setJobTitle, summary, setSummary, notes, setNotes,
    lines, setLines, filteredCustomers,
    paymentTermsDays, setPaymentTermsDays, dueDate, setDueDate, dueDateLabel,
    markupPct, setMarkupPct, toggleLineLock, roundUp, setRoundUp,
    upsertLine, removeLine, startManual,
    restorable, restoreDraft, forgetSavedDraft,
    subtotal, gst, total, totalCost, profit, jobTotal, remainingAfter,
    invoicePayload, shareAnyway,
    error, setError, saving, save, hasWork,
    showSendSheet, setShowSendSheet, handleSendPress, sendActions,
    aiBusy, generateFromDescription,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
