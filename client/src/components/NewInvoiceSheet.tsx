import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useCustomers } from "@/hooks/use-customers";
import { useQuotes } from "@/hooks/use-quotes";
import { useCreateInvoice, useCreateInvoiceFromQuote } from "@/hooks/use-invoices";
import { useXeroStatus, useXeroCreateInvoice } from "@/hooks/use-xero";
import { useUserSettings } from "@/hooks/use-user-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, FileText, Sparkles, ClipboardList, ExternalLink, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Mode = "select" | "from-quote" | "ai" | "xero" | "manual";
type AIPhase = "input" | "generating" | "review";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function parseQuoteContent(content: string | null): { jobTitle?: string; items?: LineItem[] } {
  if (!content) return {};
  try { return JSON.parse(content); } catch { return {}; }
}

export function NewInvoiceSheet({ open, onOpenChange }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: quotes } = useQuotes();
  const { data: settings } = useUserSettings();
  const { data: xeroStatus } = useXeroStatus();

  const { mutate: createInvoice, isPending: creatingManual } = useCreateInvoice();
  const { mutate: createFromQuote, isPending: creatingFromQuote } = useCreateInvoiceFromQuote();
  const { mutate: createXeroInvoice, isPending: creatingXero } = useXeroCreateInvoice();

  const [mode, setMode] = useState<Mode>("select");

  // ── From-Quote state ──────────────────────────────────────────────
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);

  // ── AI state ─────────────────────────────────────────────────────
  const [aiPhase, setAIPhase] = useState<AIPhase>("input");
  const [aiCustomerId, setAICustomerId] = useState("");
  const [aiDescription, setAIDescription] = useState("");
  const [aiItems, setAIItems] = useState<LineItem[]>([]);
  const [aiIncludeGST, setAIIncludeGST] = useState(false);
  const [aiDueDate, setAIDueDate] = useState("");

  // ── Manual state ──────────────────────────────────────────────────
  const paymentDays = Number(settings?.paymentTermsDays ?? 14);
  const defaultDueDate = format(addDays(new Date(), paymentDays), "yyyy-MM-dd");

  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [includeGST, setIncludeGST] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  // ── Derived data ──────────────────────────────────────────────────
  const acceptedQuotes = useMemo(() =>
    (quotes || []).filter(q => q.status === "accepted"),
    [quotes]
  );

  const getCustomerName = (cid: number | null) => {
    if (!cid) return "No customer";
    return customers?.find(c => c.id === cid)?.name || "Unknown";
  };

  // ── Reset ─────────────────────────────────────────────────────────
  const reset = () => {
    setMode("select");
    setSelectedQuoteId(null);
    setAIPhase("input");
    setAICustomerId("");
    setAIDescription("");
    setAIItems([]);
    setAIIncludeGST(false);
    setAIDueDate("");
    setCustomerId("");
    setDueDate(defaultDueDate);
    setIncludeGST(false);
    setNotes("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
  };

  // ── From-Quote handler ────────────────────────────────────────────
  const handleFromQuote = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    createFromQuote(quoteId, {
      onSuccess: (invoice) => {
        reset();
        onOpenChange(false);
        setLocation(`/invoices/${invoice.id}`);
      },
    });
  };

  // ── AI generate handler ───────────────────────────────────────────
  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAIPhase("generating");
    try {
      const customerName = aiCustomerId
        ? customers?.find(c => c.id === Number(aiCustomerId))?.name
        : undefined;
      const body: Record<string, any> = {
        description: aiDescription,
        customerName,
        markupPercent: settings?.markupPercent ?? 20,
        callOutFee: 0,
        includeGST: settings?.includeGST ?? false,
      };
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Generation failed");
      const data = await res.json();
      const generated: LineItem[] = (data.items || []).map((item: any) => ({
        description: item.description || "Item",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      }));
      setAIItems(generated);
      setAIIncludeGST(!!data.includeGST);
      setAIDueDate(defaultDueDate);
      setAIPhase("review");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setAIPhase("input");
    }
  };

  const updateAIItem = (i: number, field: keyof LineItem, value: string | number) =>
    setAIItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const removeAIItem = (i: number) =>
    setAIItems(prev => prev.filter((_, idx) => idx !== i));

  const aiSubtotal = aiItems.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const aiGST = aiIncludeGST ? +(aiSubtotal * 0.1).toFixed(2) : 0;
  const aiTotal = aiSubtotal + aiGST;

  const handleCreateFromAI = () => {
    if (!aiItems.length) return;
    createInvoice(
      {
        customerId: aiCustomerId ? Number(aiCustomerId) : 0,
        items: aiItems,
        dueDate: aiDueDate || undefined,
        includeGST: aiIncludeGST,
      },
      {
        onSuccess: (invoice) => {
          reset();
          onOpenChange(false);
          setLocation(`/invoices/${invoice.id}`);
        },
      }
    );
  };

  // ── Xero handler ──────────────────────────────────────────────────
  const handleXero = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    createXeroInvoice(quoteId, {
      onSuccess: () => {
        // Also create the local invoice
        createFromQuote(quoteId, {
          onSuccess: (invoice) => {
            reset();
            onOpenChange(false);
            setLocation(`/invoices/${invoice.id}`);
          },
          onError: () => {
            // Xero succeeded but local failed — just close
            reset();
            onOpenChange(false);
          },
        });
      },
    });
  };

  // ── Manual handlers ───────────────────────────────────────────────
  const addItem = () => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const gstAmount = includeGST ? +(subtotal * 0.1).toFixed(2) : 0;
  const total = subtotal + gstAmount;

  const canSubmitManual =
    customerId &&
    items.length > 0 &&
    items.every(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0);

  const handleCreateManual = () => {
    if (!canSubmitManual) return;
    createInvoice(
      {
        customerId: Number(customerId),
        items,
        dueDate,
        notes: notes.trim() || undefined,
        includeGST,
      },
      {
        onSuccess: (invoice) => {
          reset();
          onOpenChange(false);
          setLocation(`/invoices/${invoice.id}`);
        },
      }
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="rounded-[2rem] max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* ── MODE SELECT ── */}
        {mode === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                New Invoice
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground -mt-1">How do you want to create this invoice?</p>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* From Quote */}
              <button
                onClick={() => setMode("from-quote")}
                className="flex flex-col items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-blue-900 dark:text-blue-100">From Quote</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 leading-snug">Convert an accepted quote</p>
                </div>
              </button>

              {/* AI Generate */}
              <button
                onClick={() => setMode("ai")}
                className="flex flex-col items-start gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-violet-900 dark:text-violet-100">AI Generate</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 leading-snug">Describe the job, AI builds it</p>
                </div>
              </button>

              {/* Xero (if connected) */}
              {xeroStatus?.connected && (
                <button
                  onClick={() => setMode("xero")}
                  className="flex flex-col items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">Send to Xero</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 leading-snug">Push to {xeroStatus.tenantName || "Xero"}</p>
                  </div>
                </button>
              )}

              {/* Manual */}
              <button
                onClick={() => setMode("manual")}
                className="flex flex-col items-start gap-2 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-400 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Manual</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Build line by line</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── FROM QUOTE ── */}
        {mode === "from-quote" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMode("select")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold">From Accepted Quote</h2>
            </div>

            {acceptedQuotes.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="font-medium text-muted-foreground text-sm">No accepted quotes</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Once a customer accepts a quote it'll appear here.</p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => setMode("select")}
                >
                  Back
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {acceptedQuotes.map(quote => {
                  const parsed = parseQuoteContent(quote.content);
                  const isLoading = creatingFromQuote && selectedQuoteId === quote.id;
                  return (
                    <button
                      key={quote.id}
                      onClick={() => !creatingFromQuote && handleFromQuote(quote.id)}
                      disabled={creatingFromQuote}
                      className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-left active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {parsed.jobTitle || `Quote #${quote.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getCustomerName(quote.customerId)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <>
                              <p className="font-bold text-sm text-foreground">
                                ${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide mt-0.5">Accepted</p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── AI GENERATE ── */}
        {mode === "ai" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setAIPhase("input"); setMode("select"); }}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold">
                {aiPhase === "review" ? "Review AI Invoice" : "AI Invoice"}
              </h2>
            </div>

            {aiPhase === "input" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer (optional)</Label>
                  <Select value={aiCustomerId} onValueChange={setAICustomerId}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers || []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Describe the job</Label>
                  <Textarea
                    value={aiDescription}
                    onChange={e => setAIDescription(e.target.value)}
                    placeholder="e.g. Replaced kitchen tap, fixed leaking pipe under sink, supplied materials"
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </div>

                <Button
                  onClick={handleAIGenerate}
                  disabled={!aiDescription.trim()}
                  className="w-full h-14 rounded-2xl text-base font-bold bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Invoice
                </Button>
              </div>
            )}

            {aiPhase === "generating" && (
              <div className="flex flex-col items-center justify-center py-14 gap-4">
                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-600 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">Building your invoice…</p>
                  <p className="text-sm text-muted-foreground mt-1">AI is generating line items</p>
                </div>
              </div>
            )}

            {aiPhase === "review" && (
              <div className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</Label>
                  {aiItems.map((item, i) => (
                    <div key={i} className="space-y-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.description}
                          onChange={e => updateAIItem(i, "description", e.target.value)}
                          placeholder="Description"
                          className="rounded-xl flex-1"
                        />
                        {aiItems.length > 1 && (
                          <button onClick={() => removeAIItem(i)} className="p-1.5 text-red-500 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.quantity}
                            onChange={e => updateAIItem(i, "quantity", parseFloat(e.target.value) || 0)}
                            className="rounded-xl h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Unit Price ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={e => updateAIItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="rounded-xl h-10"
                          />
                        </div>
                      </div>
                      {item.quantity > 0 && item.unitPrice > 0 && (
                        <p className="text-xs text-right text-muted-foreground font-medium">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setAIItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
                    className="w-full h-10 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-primary/60 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                {/* Customer */}
                {!aiCustomerId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</Label>
                    <Select value={aiCustomerId} onValueChange={setAICustomerId}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select customer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(customers || []).map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={aiDueDate}
                    onChange={e => setAIDueDate(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* GST Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Include GST (10%)</p>
                    <p className="text-xs text-muted-foreground">Adds 10% to the subtotal</p>
                  </div>
                  <button
                    onClick={() => setAIIncludeGST(v => !v)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      aiIncludeGST ? "bg-primary" : "bg-black/20 dark:bg-white/20"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                      aiIncludeGST ? "left-[26px]" : "left-0.5"
                    )} />
                  </button>
                </div>

                {/* Totals */}
                <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${aiSubtotal.toFixed(2)}</span>
                  </div>
                  {aiIncludeGST && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST (10%)</span>
                      <span className="font-medium">${aiGST.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-black/5 dark:border-white/10">
                    <span>Total</span>
                    <span className="text-primary text-lg">${aiTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCreateFromAI}
                  disabled={!aiItems.length || creatingManual}
                  className="w-full h-14 rounded-2xl text-base font-bold bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {creatingManual ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating…</> : "Create Invoice"}
                </Button>

                <button
                  onClick={() => setAIPhase("input")}
                  className="w-full text-sm text-muted-foreground text-center py-1"
                >
                  ← Regenerate
                </button>
              </div>
            )}
          </>
        )}

        {/* ── XERO ── */}
        {mode === "xero" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setMode("select")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold">Send to Xero</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 ml-10">
              Connected to {xeroStatus?.tenantName || "Xero"} · Select an accepted quote to invoice
            </p>

            {acceptedQuotes.length === 0 ? (
              <div className="text-center py-10">
                <ExternalLink className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="font-medium text-muted-foreground text-sm">No accepted quotes</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Once a customer accepts a quote it'll appear here.</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setMode("select")}>
                  Back
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {acceptedQuotes.map(quote => {
                  const parsed = parseQuoteContent(quote.content);
                  const isLoading = (creatingXero || creatingFromQuote) && selectedQuoteId === quote.id;
                  return (
                    <button
                      key={quote.id}
                      onClick={() => !(creatingXero || creatingFromQuote) && handleXero(quote.id)}
                      disabled={creatingXero || creatingFromQuote}
                      className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-left active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {parsed.jobTitle || `Quote #${quote.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getCustomerName(quote.customerId)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          ) : (
                            <>
                              <p className="font-bold text-sm text-foreground">
                                ${Number(quote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mt-0.5">Send to Xero</p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── MANUAL ── */}
        {mode === "manual" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMode("select")} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold">Manual Invoice</h2>
            </div>

            <div className="space-y-5">
              {/* Customer */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers || []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</Label>
                {items.map((item, i) => (
                  <div key={i} className="space-y-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(i, "description", e.target.value)}
                        placeholder="Description"
                        className="rounded-xl flex-1"
                      />
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-1.5 text-red-500 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.quantity}
                          onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                          className="rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Unit Price ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={e => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="rounded-xl h-10"
                        />
                      </div>
                    </div>
                    {item.quantity > 0 && item.unitPrice > 0 && (
                      <p className="text-xs text-right text-muted-foreground font-medium">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="w-full h-10 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-primary/60 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {/* GST Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Include GST (10%)</p>
                  <p className="text-xs text-muted-foreground">Adds 10% to the subtotal</p>
                </div>
                <button
                  onClick={() => setIncludeGST(v => !v)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    includeGST ? "bg-primary" : "bg-black/20 dark:bg-white/20"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                    includeGST ? "left-[26px]" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Totals */}
              <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {includeGST && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (10%)</span>
                    <span className="font-medium">${gstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-black/5 dark:border-white/10">
                  <span>Total</span>
                  <span className="text-primary text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notes <span className="normal-case font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Payment instructions, job details…"
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleCreateManual}
                disabled={!canSubmitManual || creatingManual}
                className={cn(
                  "w-full h-14 rounded-2xl text-base font-bold",
                  canSubmitManual ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {creatingManual ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating…</> : "Create Invoice"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
