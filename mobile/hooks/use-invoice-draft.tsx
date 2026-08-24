import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDays, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { apiRequest } from '@/lib/api';
import { parseQuoteContent } from '@shared/mobile-types';
import { useQuote } from '@/hooks/use-quotes';
import { useJob } from '@/hooks/use-jobs';
import { useCustomer } from '@/hooks/use-customers';
import { useCreateInvoice, useConvertQuoteToInvoice, useInvoices } from '@/hooks/use-invoices';
import { useSettings } from '@/hooks/use-settings';

export type LineItem = { description: string; qty: string; unitPrice: string };
type AiSuggestion = { description: string; quantity: number; unitPrice: number };
export type InvoiceType = 'full' | 'deposit' | 'balance';

/**
 * Shared draft for the stepped New Invoice flow. Holds both the convert-from-
 * quote path and the standalone manual path. Logic is lifted verbatim from the
 * old single-screen invoices/create.tsx so behaviour is unchanged.
 */
type InvoiceDraft = {
  // entry
  fromQuoteEntry: boolean;   // arrived pointed at a specific quote
  fromJobEntry: boolean;

  // convert-from-quote
  selectedQuoteId: number;
  setSelectedQuoteId: (id: number) => void;
  quoteLoading: boolean;
  quoteTitle: string; quoteCustomer: string; quoteItemCount: number; quoteTotal: number;
  invoiceType: InvoiceType; setInvoiceType: (t: InvoiceType) => void;
  depositPercent: number; setDepositPercent: (p: number) => void;
  priorInvoiced: number;
  handleConvert: () => void;

  // standalone fields
  jobTitle: string; setJobTitle: (v: string) => void; onJobTitleBlur: () => void;
  customerName: string; setCustomerName: (v: string) => void;
  labourRate: string; setLabourRate: (v: string) => void;
  labourHours: string; setLabourHours: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  lines: LineItem[];
  addLine: () => void; removeLine: (i: number) => void; updateLine: (i: number, f: keyof LineItem, v: string) => void;

  // AI suggestions
  aiSuggestions: AiSuggestion[]; loadingSuggestions: boolean; addSuggestion: (s: AiSuggestion) => void;

  // totals
  labourTotal: number; standaloneTotal: number; standaloneGST: number; standaloneFinal: number;

  // meta + actions
  paymentTermsDays: number; dueDateStr: string;
  error: string | null; setError: (v: string | null) => void;
  saving: boolean;
  handleCreateStandalone: (status: 'draft' | 'sent') => void;
};

const Ctx = createContext<InvoiceDraft | null>(null);

export function useInvoiceDraft(): InvoiceDraft {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInvoiceDraft must be used inside InvoiceDraftProvider');
  return v;
}

export function InvoiceDraftProvider({ children }: { children: ReactNode }) {
  const params = useLocalSearchParams<{ quoteId?: string; jobId?: string }>();
  const initial = useRef({
    quoteId: params.quoteId ? Number(params.quoteId) : 0,
    jobId: params.jobId ? Number(params.jobId) : 0,
  });
  const fromQuoteEntry = initial.current.quoteId > 0;
  const fromJobEntry = initial.current.jobId > 0;

  const [selectedQuoteId, setSelectedQuoteId] = useState(initial.current.quoteId);

  const { data: quote, isLoading: quoteLoading } = useQuote(selectedQuoteId) as any;
  const { data: sourceJob } = useJob(initial.current.jobId) as any;
  const { data: sourceJobCustomer } = useCustomer(sourceJob?.customerId || 0) as any;

  const quoteContent = useMemo(() => parseQuoteContent(quote?.content), [quote?.content]);
  const quoteTitle = quoteContent.jobTitle || (selectedQuoteId ? `Quote #${selectedQuoteId}` : '');
  const quoteCustomer = quoteContent.customerName || '';
  const quoteItemCount = quoteContent.items?.length || quoteContent.lines?.length || 0;
  const quoteTotal = quote?.totalAmount ? parseFloat(quote.totalAmount) : 0;

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('full');
  const [depositPercent, setDepositPercent] = useState(50);
  const { data: allInvoices } = useInvoices();
  const priorInvoiced = useMemo(() => {
    if (!selectedQuoteId) return 0;
    return ((allInvoices as any[]) || [])
      .filter((i: any) => i.quoteId === selectedQuoteId)
      .reduce((s: number, i: any) => s + (Number(i.totalAmount) || 0), 0);
  }, [allInvoices, selectedQuoteId]);
  useEffect(() => {
    if (priorInvoiced > 0 && invoiceType === 'full') setInvoiceType('balance');
  }, [priorInvoiced, invoiceType]);

  // Standalone form state
  const [jobTitle, setJobTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [labourRate, setLabourRate] = useState('');
  const [labourHours, setLabourHours] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ description: '', qty: '1', unitPrice: '' }]);
  const [error, setError] = useState<string | null>(null);

  // Prefill from a source job
  const jobPrefilled = useRef(false);
  useEffect(() => {
    if (!sourceJob || jobPrefilled.current) return;
    jobPrefilled.current = true;
    if (sourceJob.title) setJobTitle(prev => prev || sourceJob.title);
    let completion: any = {};
    try { completion = JSON.parse(sourceJob.completionData || '{}'); } catch {}
    const hours = completion.actualHours ?? (sourceJob.estimatedDuration ? sourceJob.estimatedDuration / 60 : null);
    if (hours) setLabourHours(prev => prev || String(hours));
    if (sourceJob.description) setNotes(prev => prev || sourceJob.description);
  }, [sourceJob]);
  useEffect(() => {
    if (sourceJobCustomer?.name) setCustomerName(prev => prev || sourceJobCustomer.name);
  }, [sourceJobCustomer]);

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedForTitle, setSuggestedForTitle] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convertMutation = useConvertQuoteToInvoice();
  const createMutation = useCreateInvoice();
  const { data: settings } = useSettings();
  const paymentTermsDays = Number(settings?.paymentTermsDays ?? 14) || 14;
  const dueDateStr = format(addDays(new Date(), paymentTermsDays), 'EEE d MMM yyyy');

  const labourTotal = (parseFloat(labourRate) || 0) * (parseFloat(labourHours) || 0);
  const lineItemsTotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const standaloneTotal = lineItemsTotal + labourTotal;
  const standaloneGST = Math.round(standaloneTotal * 0.1 * 100) / 100;
  const standaloneFinal = standaloneTotal + standaloneGST;

  const addLine = () => setLines(prev => [...prev, { description: '', qty: '1', unitPrice: '' }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const fetchAiSuggestions = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 3 || trimmed === suggestedForTitle) return;
    setSuggestedForTitle(trimmed);
    setLoadingSuggestions(true);
    setAiSuggestions([]);
    try {
      const res = await apiRequest('POST', '/api/quotes/generate', {
        description: trimmed,
        labourRate: labourRate ? parseFloat(labourRate) : undefined,
        includeGST: true,
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions((data.items || []).map((it: any) => ({
          description: it.description, quantity: it.quantity || 1, unitPrice: it.unitPrice || 0,
        })));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch { /* non-critical */ } finally {
      setLoadingSuggestions(false);
    }
  };
  const onJobTitleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAiSuggestions(jobTitle), 300);
  };
  const addSuggestion = (sug: AiSuggestion) => {
    Haptics.selectionAsync();
    setLines(prev => {
      const emptyIdx = prev.findIndex(l => !l.description.trim() && !l.unitPrice.trim());
      const newLine = { description: sug.description, qty: String(sug.quantity), unitPrice: String(sug.unitPrice) };
      if (emptyIdx !== -1) return prev.map((l, i) => i === emptyIdx ? newLine : l);
      return [...prev, newLine];
    });
    setAiSuggestions(prev => prev.filter(s => s.description !== sug.description));
  };

  const leaveTo = (id: number) => {
    try { router.dismissAll(); } catch {}
    router.replace(`/invoices/${id}` as any);
  };
  const onErr = (err: any) => {
    const raw = err?.message || '';
    const msg = raw.toLowerCase().includes('unauthorized') || raw === '401'
      ? 'Your session has expired — please log in again.'
      : raw || 'Could not create invoice. Try again.';
    setError(msg);
  };

  const handleConvert = () => {
    setError(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    convertMutation.mutate({
      quoteId: selectedQuoteId,
      type: invoiceType,
      ...(invoiceType === 'deposit' ? { depositPercent } : {}),
    }, {
      onSuccess: (invoice: any) => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); leaveTo(invoice.id); },
      onError: onErr,
    });
  };

  const handleCreateStandalone = (status: 'draft' | 'sent') => {
    const validLines = lines.filter(l => l.description.trim() && parseFloat(l.unitPrice) > 0);
    if (labourTotal > 0) {
      validLines.push({ description: `Labour${labourHours ? ` — ${labourHours} hrs` : ''}`, qty: labourHours || '1', unitPrice: labourRate || '0' });
    }
    if (validLines.length === 0) { setError('Add at least one line item with a description and price.'); return; }
    setError(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate({
      customerName: customerName.trim() || undefined,
      items: validLines.map(l => ({ description: l.description.trim(), quantity: parseFloat(l.qty) || 1, unit: 'each', unitPrice: parseFloat(l.unitPrice) || 0 })),
      notes: [jobTitle.trim() ? `Job: ${jobTitle.trim()}` : '', notes.trim()].filter(Boolean).join('\n') || undefined,
      includeGST: true,
      status,
    } as any, {
      onSuccess: (invoice: any) => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); leaveTo(invoice.id); },
      onError: onErr,
    });
  };

  const value: InvoiceDraft = {
    fromQuoteEntry, fromJobEntry,
    selectedQuoteId, setSelectedQuoteId, quoteLoading: !!selectedQuoteId && quoteLoading,
    quoteTitle, quoteCustomer, quoteItemCount, quoteTotal,
    invoiceType, setInvoiceType, depositPercent, setDepositPercent, priorInvoiced, handleConvert,
    jobTitle, setJobTitle, onJobTitleBlur, customerName, setCustomerName,
    labourRate, setLabourRate, labourHours, setLabourHours, notes, setNotes,
    lines, addLine, removeLine, updateLine,
    aiSuggestions, loadingSuggestions, addSuggestion,
    labourTotal, standaloneTotal, standaloneGST, standaloneFinal,
    paymentTermsDays, dueDateStr,
    error, setError, saving: convertMutation.isPending || createMutation.isPending,
    handleCreateStandalone,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
