import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { useQuote } from '@/hooks/use-quotes';
import { useCustomers } from '@/hooks/use-customers';
import { useSettings } from '@/hooks/use-settings';
import { parseQuoteContent } from '@shared/mobile-types';
import type { SheetAction } from '@/components/ActionSheetModal';

// `unit` and `cost` come from AI output. cost is what the tradie actually pays
// (as opposed to `price`, what they charge) and is the basis for a real profit
// margin — without it a "margin" can only ever be a fixed ratio of the price.
export type LineItem = { name: string; qty: string; price: string; unit?: string; cost?: string };
const DEFAULT_LINES: LineItem[] = [{ name: '', qty: '1', price: '' }];

/**
 * Shared draft for the stepped New Quote flow. Lives in the create/_layout so
 * every step reads and writes the same in-progress quote, and it's discarded
 * when the whole flow unmounts. The save/validation/send logic is lifted
 * verbatim from the old single-screen create.tsx so behaviour is unchanged.
 */
type QuoteDraft = {
  isEditing: boolean;
  editId: number;
  // fields
  customer: string; setCustomer: (v: string) => void;
  customerId: number | null; setCustomerId: (v: number | null) => void;
  selectedCustomer: any;
  jobTitle: string; setJobTitle: (v: string) => void;
  summary: string; setSummary: (v: string) => void;
  schedDate: string; setSchedDate: (v: string) => void;
  expiryDate: string; setExpiryDate: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  lines: LineItem[]; setLines: React.Dispatch<React.SetStateAction<LineItem[]>>;
  // customer search
  custSearch: string; setCustSearch: (v: string) => void;
  showCustList: boolean; setShowCustList: (v: boolean) => void;
  filteredCustomers: any[];
  // line editing
  editLineIdx: number | null;
  editLineDraft: LineItem; setEditLineDraft: React.Dispatch<React.SetStateAction<LineItem>>;
  openLineEdit: (i: number) => void;
  saveLineEdit: () => void;
  deleteLineFromModal: () => void;
  addLine: () => void;
  closeLineEdit: () => void;
  // totals
  subtotal: number; gst: number; total: number;
  // save + send
  error: string | null; setError: (v: string | null) => void;
  saving: boolean;
  save: (status: 'draft' | 'sent') => void;
  hasWork: () => boolean;
  showSendSheet: boolean; setShowSendSheet: (v: boolean) => void;
  handleSendPress: () => void;
  sendActions: SheetAction[];
  // AI assist inside the manual flow
  aiBusy: boolean;
  generateItemsWithAI: () => void;
  /** Full AI generation for the Describe step — fills the whole draft, not just lines. */
  generateFromDescription: (description: string) => Promise<boolean>;
};

const Ctx = createContext<QuoteDraft | null>(null);

export function useQuoteDraft(): QuoteDraft {
  const v = useContext(Ctx);
  if (!v) throw new Error('useQuoteDraft must be used inside QuoteDraftProvider');
  return v;
}

export function QuoteDraftProvider({ children }: { children: ReactNode }) {
  // Capture the entry params once — they belong to the flow, not to whichever
  // step happens to be focused later.
  const params = useLocalSearchParams<{ customerName?: string; customerId?: string; quoteId?: string }>();
  const initial = useRef({
    prefillName: params.customerName,
    prefillCustomerId: params.customerId,
    editId: params.quoteId ? Number(params.quoteId) : 0,
  });
  const editId = initial.current.editId;
  const isEditing = editId > 0;

  const { data: allCustomers } = useCustomers() as any;
  const [custSearch, setCustSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const filteredCustomers = useMemo(() => {
    const list: any[] = allCustomers || [];
    if (!custSearch.trim()) return list.slice(0, 6);
    return list.filter((x: any) => x.name?.toLowerCase().includes(custSearch.toLowerCase())).slice(0, 6);
  }, [allCustomers, custSearch]);

  const [customer, setCustomer] = useState(initial.current.prefillName || '');
  const [customerId, setCustomerId] = useState<number | null>(
    initial.current.prefillName && initial.current.prefillCustomerId ? Number(initial.current.prefillCustomerId) : null
  );
  const selectedCustomer = (allCustomers as any[])?.find((x: any) => x.id === customerId);
  const [jobTitle, setJobTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState(() => format(addDays(new Date(), 30), 'd MMM yyyy'));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>(DEFAULT_LINES);
  const [error, setError] = useState<string | null>(null);
  const [populated, setPopulated] = useState(false);

  const [editLineIdx, setEditLineIdx] = useState<number | null>(null);
  const [editLineDraft, setEditLineDraft] = useState<LineItem>({ name: '', qty: '1', price: '' });

  const openLineEdit = (i: number) => { setEditLineDraft({ ...lines[i] }); setEditLineIdx(i); };
  const closeLineEdit = () => setEditLineIdx(null);
  const saveLineEdit = () => {
    if (editLineIdx !== null) setLines(prev => prev.map((l, i) => i === editLineIdx ? editLineDraft : l));
    setEditLineIdx(null);
  };
  const deleteLineFromModal = () => {
    if (editLineIdx !== null) setLines(prev => prev.filter((_, i) => i !== editLineIdx));
    setEditLineIdx(null);
  };
  const addLine = () => {
    const newIdx = lines.length;
    setLines(prev => [...prev, { name: '', qty: '1', price: '' }]);
    setEditLineDraft({ name: '', qty: '1', price: '' });
    setEditLineIdx(newIdx);
  };

  // Prefill when editing
  const { data: editQuote } = useQuote(editId);
  useEffect(() => {
    if (!editQuote || populated) return;
    const c = parseQuoteContent((editQuote as any).content);
    setJobTitle(c.jobTitle || '');
    setSummary((c as any).summary || '');
    setCustomer(c.customerName || '');
    if ((editQuote as any).customerId) setCustomerId((editQuote as any).customerId);
    setSchedDate(c.schedDate || '');
    setExpiryDate(c.expiryDate || format(addDays(new Date(), 30), 'd MMM yyyy'));
    setNotes(c.notes || '');
    if (c.lines?.length) {
      setLines(c.lines.map((l: any) => ({ name: l.name || '', qty: String(l.qty || 1), price: String(l.price || '') })));
    } else if (c.items?.length) {
      setLines(c.items.map((it: any) => ({ name: it.description || '', qty: String(it.quantity || 1), price: String(it.unitPrice || '') })));
    }
    setPopulated(true);
  }, [editQuote]);

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);
  const gst = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + gst;

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      const originalContent: any = isEditing ? parseQuoteContent((editQuote as any)?.content) : {};
      const mergedContent: any = {
        ...originalContent,
        customerName: customer, jobTitle, summary, schedDate, expiryDate, notes, lines,
      };
      mergedContent.items = lines.map(l => ({
        description: l.name,
        quantity: parseFloat(l.qty) || 1,
        unit: l.unit || 'ea',
        unitPrice: parseFloat(l.price) || 0,
      }));
      mergedContent.subtotal = subtotal;
      mergedContent.gstAmount = gst;
      mergedContent.totalAmount = total;
      const body = {
        totalAmount: String(total),
        status,
        customerId: customerId ?? undefined,
        jobTitle: jobTitle.trim() || undefined,
        content: JSON.stringify(mergedContent),
      };
      const res = isEditing
        ? await apiRequest('PATCH', `/api/quotes/${editId}`, body)
        : await apiRequest('POST', '/api/quotes', body);
      if (!res.ok) throw new Error('Failed to save quote');
      const saved = await res.json();

      // Keep the quote_items ROWS in step with the content JSON. The quote detail
      // screen prefers rows over content, so writing content alone (as this did
      // before) left an edited quote showing its original line items beside its
      // new total — numbers that no longer added up.
      const savedId = Number(saved?.id) || editId;
      if (savedId) {
        if (isEditing) {
          try {
            const cur = await apiRequest('GET', `/api/quotes/${savedId}/items`);
            if (cur.ok) {
              const rows: any[] = await cur.json();
              await Promise.all(rows.map(r =>
                apiRequest('DELETE', `/api/quotes/items/${r.id}`).catch(() => {})
              ));
            }
          } catch { /* fall through — better a fresh set than none */ }
        }
        for (const l of lines) {
          const price = parseFloat(l.price) || 0;
          if (!l.name.trim() && price <= 0) continue;
          await apiRequest('POST', `/api/quotes/${savedId}/items`, {
            description: l.name.trim() || 'Item',
            quantity: parseFloat(l.qty) || 1,
            price: String(price),
          }).catch(() => {});
        }
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      // Leave the whole flow cleanly — clear the create sub-stack, then land on
      // the quotes list rather than an intermediate step.
      try { router.dismissAll(); } catch {}
      router.replace('/(tabs)/quotes');
    },
    onError: () => showAlert('Could not save', 'Check your connection and try again.'),
  });

  const validateForm = (): boolean => {
    if (!jobTitle.trim()) { setError('Job title is required'); return false; }
    if (lines.every(l => !l.price || parseFloat(l.price) <= 0)) { setError('Add at least one line item with a price'); return false; }
    if (lines.some(l => parseFloat(l.price) > 0 && !l.name.trim())) { setError('All priced line items need a description'); return false; }
    setError(null);
    return true;
  };

  const save = (status: 'draft' | 'sent') => { if (validateForm()) saveMutation.mutate(status); };

  const hasWork = () =>
    !!(customer.trim() || jobTitle.trim() || schedDate.trim() || notes.trim() ||
      lines.some(l => l.name.trim() || l.qty !== '1' || l.price.trim()));

  const [showSendSheet, setShowSendSheet] = useState(false);
  const handleSendPress = () => { if (validateForm()) setShowSendSheet(true); };
  const sendViaChannel = (open: () => void) => saveMutation.mutate('sent', { onSuccess: open });
  const sendActions: SheetAction[] = [
    selectedCustomer?.email ? {
      label: 'Email customer',
      onPress: () => sendViaChannel(() =>
        Linking.openURL(`mailto:${selectedCustomer.email}?subject=Your quote&body=Hi ${customer || 'there'},\n\nPlease find your quote attached.\n\nTotal: $${total.toFixed(2)} inc. GST\n\nThanks`)
      ),
    } : null,
    selectedCustomer?.phone ? {
      label: 'Send SMS',
      onPress: () => sendViaChannel(() => Linking.openURL(`sms:${selectedCustomer.phone}`)),
    } : null,
    {
      label: 'Share link',
      onPress: () => sendViaChannel(() => Share.share({ message: `Quote — $${total.toFixed(2)} (inc. GST)` })),
    },
  ].filter(Boolean) as SheetAction[];

  // ── AI generation ──────────────────────────────────────────────────────────
  // One client for both AI entry points (the Describe step and "build these from
  // the job" on Items). It sends the tradie's real pricing settings so the quote
  // comes back calibrated, rather than the bare description the manual flow used
  // to send.
  const [aiBusy, setAiBusy] = useState(false);
  const { data: settings } = useSettings() as any;

  const callAi = async (description: string): Promise<any> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quotes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
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
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 401 ? 'Please sign in to use AI.'
            : (body?.message || 'AI could not build the quote — try again.')
        );
      }
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const linesFromAi = (data: any): LineItem[] => {
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((it: any) => ({
      name: it.description || '',
      qty: String(it.quantity || 1),
      price: String(it.unitPrice || 0),
      unit: it.unit || 'ea',
    }));
  };

  /** Fill the whole draft from an AI result — used by the Describe step. */
  const generateFromDescription = async (description: string): Promise<boolean> => {
    setAiBusy(true);
    setError(null);
    try {
      const data = await callAi(description);
      const newLines = linesFromAi(data);
      if (!newLines.length) throw new Error("AI didn't return any line items.");
      setLines(newLines);
      if (data.jobTitle) setJobTitle(String(data.jobTitle));
      if (data.summary) setSummary(String(data.summary));
      if (data.notes) setNotes(String(data.notes));
      // Keep the tradie's own words as the job description if AI gave no summary
      if (!data.summary && description.trim()) setSummary(description.trim());
      return true;
    } catch (e: any) {
      setError(e?.name === 'AbortError' ? 'AI timed out — try again.' : (e?.message || 'Something went wrong.'));
      return false;
    } finally {
      setAiBusy(false);
    }
  };

  const runAiGenerate = async () => {
    setAiBusy(true);
    setError(null);
    try {
      const desc = [jobTitle.trim(), notes.trim()].filter(Boolean).join(' — ');
      const data = await callAi(desc);
      const newLines = linesFromAi(data);
      if (!newLines.length) throw new Error("AI didn't return any line items.");
      setLines(newLines);
    } catch (e: any) {
      showAlert('AI assist', e?.name === 'AbortError' ? 'AI timed out — try again.' : (e?.message || 'Something went wrong.'));
    } finally {
      setAiBusy(false);
    }
  };

  const generateItemsWithAI = () => {
    if (!jobTitle.trim() && !notes.trim()) {
      showAlert('Add a job first', 'Enter a job title or notes so AI knows what to quote.');
      return;
    }
    const hasExisting = lines.some(l => l.name.trim() || l.price.trim());
    const proceed = () => showConfirm({
      title: 'Your quote, your call',
      message: 'By continuing, you take full ownership of this AI-generated quote. You are responsible for checking the pricing, scope and compliance before you send it to a customer.',
      confirmLabel: 'I understand',
      onConfirm: runAiGenerate,
    });
    if (hasExisting) {
      showConfirm({
        title: 'Replace your line items?',
        message: 'AI will replace the items you’ve added.',
        confirmLabel: 'Replace',
        destructive: true,
        onConfirm: proceed,
      });
    } else {
      proceed();
    }
  };

  const value: QuoteDraft = {
    isEditing, editId,
    customer, setCustomer, customerId, setCustomerId, selectedCustomer,
    jobTitle, setJobTitle, summary, setSummary, schedDate, setSchedDate, expiryDate, setExpiryDate, notes, setNotes,
    lines, setLines,
    custSearch, setCustSearch, showCustList, setShowCustList, filteredCustomers,
    editLineIdx, editLineDraft, setEditLineDraft, openLineEdit, saveLineEdit, deleteLineFromModal, addLine, closeLineEdit,
    subtotal, gst, total,
    error, setError, saving: saveMutation.isPending, save, hasWork,
    showSendSheet, setShowSendSheet, handleSendPress, sendActions,
    aiBusy, generateItemsWithAI, generateFromDescription,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
