import { useQuotes, useUpdateQuote, useDeleteQuote } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Share2,
  Trash2,
  Pencil,
  Copy,
  X,
  Plus,
  Save,
  ShieldCheck,
  FileText,
  Eye,
  ExternalLink,
  Receipt,
} from "lucide-react";
import AcceptAndScheduleDialog from "@/components/AcceptAndScheduleDialog";
import { jsPDF } from "jspdf";
import { useCreateInvoiceFromQuote } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ParsedContent {
  jobTitle?: string;
  customerName?: string;
  summary?: string;
  items?: { id?: string; description: string; quantity: number; unit?: string; unitPrice: number }[];
  notes?: string;
  estimatedHours?: number;
  totalLabour?: number;
  totalMaterials?: number;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  markupPercent?: number;
  callOutFee?: number;
  includeGST?: boolean;
  acknowledged?: boolean;
}

function parseContent(content: string | null): ParsedContent | null {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: quotes, isLoading } = useQuotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();
  const { mutate: updateQuote, isPending: isUpdating } = useUpdateQuote();
  const { mutate: deleteQuote, isPending: isDeleting } = useDeleteQuote();
  const createInvoiceMutation = useCreateInvoiceFromQuote();
  const { toast } = useToast();

  const quote = quotes?.find(q => q.id === id);
  const parsed = quote ? parseContent(quote.content) : null;

  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<ParsedContent["items"]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editIncludeGST, setEditIncludeGST] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledJobId, setScheduledJobId] = useState<number | null>(null);

  useEffect(() => {
    if (parsed) {
      setEditItems(parsed.items || []);
      setEditNotes(parsed.notes || "");
      setEditTitle(parsed.jobTitle || "");
      setEditIncludeGST(parsed.includeGST ?? false);
    }
  }, [quote?.content]);

  useEffect(() => {
    if (quote?.jobId) setScheduledJobId(quote.jobId);
  }, [quote?.jobId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-lg font-medium text-muted-foreground">Quote not found</p>
        <Button variant="ghost" onClick={() => setLocation("/quotes")} className="mt-4">
          Back to Quotes
        </Button>
      </div>
    );
  }

  const customerName = (() => {
    // Direct customer link (new flow)
    if (quote.customerId) {
      const customer = customers?.find(c => c.id === quote.customerId);
      if (customer) return customer.name;
    }
    // Legacy: name stored in content JSON
    if (parsed?.customerName) return parsed.customerName as string;
    if (parsed?.notes) {
      const match = (parsed.notes as string).match(/Quote for:\s*(.+?)[\.\n]/);
      if (match) return match[1].trim();
    }
    // Via linked job
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) {
        const customer = customers?.find(c => c.id === job.customerId);
        if (customer) return customer.name;
      }
    }
    return `Quote #${quote.id}`;
  })();

  const resolvedCustomerId: number | undefined = (() => {
    if (quote.customerId) return quote.customerId;
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) return job.customerId;
    }
    return undefined;
  })();

  const jobTitle = parsed?.jobTitle || (() => {
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job) return job.title;
    }
    return "Untitled Job";
  })();

  const items = parsed?.items || [];
  const subtotal = parsed?.subtotal ?? items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const gstAmount = parsed?.gstAmount ?? (parsed?.includeGST ? subtotal * 0.1 : 0);
  const totalAmount = Number(quote.totalAmount) || (subtotal + gstAmount);
  const includeGST = parsed?.includeGST ?? false;

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "sent": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "accepted": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateQuote({ id: quote.id, status: newStatus });
  };

  const calcEditTotals = () => {
    const sub = (editItems || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const gst = editIncludeGST ? sub * 0.1 : 0;
    return { subtotal: sub, gstAmount: gst, totalAmount: sub + gst };
  };

  const handleSaveEdit = () => {
    const totals = calcEditTotals();
    const updatedContent: ParsedContent = {
      ...parsed,
      jobTitle: editTitle,
      items: editItems,
      notes: editNotes,
      includeGST: editIncludeGST,
      subtotal: totals.subtotal,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      acknowledged: false,
    };
    updateQuote(
      {
        id: quote.id,
        content: JSON.stringify(updatedContent),
        totalAmount: String(totals.totalAmount),
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleDelete = () => {
    deleteQuote(id, {
      onSuccess: () => setLocation("/quotes"),
    });
  };

  const isAcknowledged = parsed?.acknowledged === true;

  const handleAcknowledge = () => {
    if (!ackChecked) return;
    const updatedContent: ParsedContent = {
      ...parsed,
      acknowledged: true,
    };
    updateQuote(
      { id: quote.id, content: JSON.stringify(updatedContent) },
      {
        onSuccess: () => {
          setAckChecked(false);
          setAckDialogOpen(false);
          setShowShareSheet(true);
          toast({ title: "Acknowledged", description: "You've accepted ownership of this quote." });
        },
      }
    );
  };

  const buildShareText = () => {
    let text = `QUOTE: ${jobTitle}\n`;
    text += `Customer: ${customerName}\n`;
    text += `Status: ${(quote.status || "draft").toUpperCase()}\n`;
    text += `Date: ${quote.createdAt ? format(new Date(quote.createdAt), "dd MMM yyyy") : "N/A"}\n\n`;
    text += `--- ITEMS ---\n`;
    items.forEach(item => {
      text += `${item.description} — ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${(item.quantity * item.unitPrice).toFixed(2)}\n`;
    });
    text += `\nSubtotal: $${subtotal.toFixed(2)}\n`;
    if (includeGST) text += `GST (10%): $${gstAmount.toFixed(2)}\n`;
    text += `TOTAL: $${totalAmount.toFixed(2)}\n`;
    if (parsed?.notes) text += `\nNotes: ${parsed.notes}\n`;
    return text;
  };

  const handleCopyQuote = () => {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      toast({ title: "Copied", description: "Quote copied to clipboard." });
      setShowShareSheet(false);
    }).catch(() => {
      toast({ title: "Copy failed", variant: "destructive" });
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quotes/${quote.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link Copied", description: "Quote link copied to clipboard." });
      setShowShareSheet(false);
    }).catch(() => {
      toast({ title: "Copy failed", variant: "destructive" });
    });
  };

  const handleViewPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    const checkPageBreak = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        y = 25;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("QUOTE", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Quote #${quote.id}`, margin, y);
    if (quote.createdAt) {
      doc.text(format(new Date(quote.createdAt), "dd MMM yyyy"), pageWidth - margin, y, { align: "right" });
    }
    y += 8;

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(jobTitle, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(customerName, margin, y);
    y += 6;

    const statusLabel = (quote.status || "draft").charAt(0).toUpperCase() + (quote.status || "draft").slice(1);
    doc.text(`Status: ${statusLabel}`, margin, y);
    y += 12;

    if (items.length > 0) {
      checkPageBreak(20);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Item", margin, y);
      doc.text("Qty", margin + contentWidth * 0.55, y, { align: "right" });
      doc.text("Unit Price", margin + contentWidth * 0.75, y, { align: "right" });
      doc.text("Total", pageWidth - margin, y, { align: "right" });
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      items.forEach((item) => {
        const descLines = doc.splitTextToSize(item.description, contentWidth * 0.5);
        const itemHeight = Math.max(descLines.length * 5, 6) + 2;
        checkPageBreak(itemHeight);
        doc.setTextColor(0, 0, 0);
        doc.text(descLines, margin, y);
        doc.text(String(item.quantity), margin + contentWidth * 0.55, y, { align: "right" });
        doc.text(`$${item.unitPrice.toFixed(2)}`, margin + contentWidth * 0.75, y, { align: "right" });
        doc.text(`$${(item.quantity * item.unitPrice).toFixed(2)}`, pageWidth - margin, y, { align: "right" });
        y += itemHeight;
      });

      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + contentWidth * 0.5, y, pageWidth - margin, y);
      y += 7;
    }

    checkPageBreak(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal", margin + contentWidth * 0.5, y);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 6;

    if (includeGST) {
      doc.setTextColor(100, 100, 100);
      doc.text("GST (10%)", margin + contentWidth * 0.5, y);
      doc.setTextColor(0, 0, 0);
      doc.text(`$${gstAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
      y += 6;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin + contentWidth * 0.5, y, pageWidth - margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Total", margin + contentWidth * 0.5, y);
    doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 12;

    if (parsed?.notes) {
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Notes", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const noteLines = doc.splitTextToSize(parsed.notes, contentWidth);
      noteLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 5;
      });
    }

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const addEditItem = () => {
    setEditItems([
      ...(editItems || []),
      { id: `new-${Date.now()}`, description: "", quantity: 1, unit: "each", unitPrice: 0 },
    ]);
  };

  const updateEditItem = (index: number, field: keyof NonNullable<ParsedContent["items"]>[number], value: string | number) => {
    const updated = [...(editItems || [])];
    const item = { ...updated[index] };
    if (field === "description" || field === "unit" || field === "id") {
      item[field] = value as string;
    } else {
      item[field] = value as number;
    }
    updated[index] = item;
    setEditItems(updated);
  };

  const removeEditItem = (index: number) => {
    const updated = [...(editItems || [])];
    updated.splice(index, 1);
    setEditItems(updated);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setLocation("/quotes")} className="p-2 -ml-2" data-testid="button-back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (!isAcknowledged) {
                      setAckChecked(false);
                      setAckDialogOpen(true);
                    } else {
                      setShowShareSheet(true);
                    }
                  }}
                  data-testid="button-share"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  data-testid="button-edit"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-500"
                  data-testid="button-delete"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </>
            )}
            {editing && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditing(false)}
                data-testid="button-cancel-edit"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 space-y-5">
        {/* Title Card */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Job title"
              data-testid="input-edit-title"
            />
          ) : (
            <h1 className="text-xl font-bold text-foreground" data-testid="text-detail-title">{jobTitle}</h1>
          )}
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-detail-customer">{customerName}</p>
          <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full capitalize", statusColor(quote.status || "draft"))} data-testid="text-detail-status">
              {quote.status || "draft"}
            </span>
            {quote.createdAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-detail-date">
                {format(new Date(quote.createdAt), "dd MMM yyyy")}
              </span>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-bold text-foreground">Line Items</h2>
            {editing && (
              <button
                onClick={addEditItem}
                className="text-primary text-sm font-bold flex items-center gap-1"
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              {(editItems || []).map((item, i) => (
                <div key={item.id || i} className="bg-[#F8F7F5] dark:bg-white/5 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateEditItem(i, "description", e.target.value)}
                      placeholder="Description"
                      className="flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 font-medium text-sm"
                      data-testid={`input-item-desc-${i}`}
                    />
                    <button onClick={() => removeEditItem(i)} className="text-red-400 p-1 shrink-0" data-testid={`button-remove-item-${i}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Qty:</span>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateEditItem(i, "quantity", Number(e.target.value))}
                        className="w-16 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
                        data-testid={`input-item-qty-${i}`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateEditItem(i, "unitPrice", Number(e.target.value))}
                        className="w-20 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
                        data-testid={`input-item-price-${i}`}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground ml-auto">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {(editItems || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No items yet. Tap Add to start.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No line items</p>
              ) : (
                items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" data-testid={`text-item-desc-${i}`}>
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit || "x"} @ ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0" data-testid={`text-item-total-${i}`}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="font-bold text-foreground mb-3">Summary</h2>
          {editing ? (
            <>
              {(() => {
                const t = calcEditTotals();
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">${t.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => setEditIncludeGST(!editIncludeGST)}
                        className={cn("flex items-center gap-2", editIncludeGST ? "text-foreground" : "text-muted-foreground")}
                        data-testid="button-toggle-gst"
                      >
                        <div className={cn("w-8 h-5 rounded-full transition-colors flex items-center px-0.5", editIncludeGST ? "bg-primary" : "bg-muted")}>
                          <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", editIncludeGST ? "translate-x-3" : "translate-x-0")} />
                        </div>
                        GST (10%)
                      </button>
                      <span className="font-medium text-foreground">${t.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-black/5 dark:border-white/10 pt-2 flex justify-between">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">${t.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
              </div>
              {includeGST && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (10%)</span>
                  <span className="font-medium text-foreground" data-testid="text-gst">${gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-black/5 dark:border-white/10 pt-2 flex justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-primary" data-testid="text-total">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {(editing || parsed?.notes) && (
          <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
            <h2 className="font-bold text-foreground mb-3">Notes</h2>
            {editing ? (
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="border-0 bg-[#F8F7F5] dark:bg-white/5 rounded-xl min-h-[80px] resize-none text-sm"
                data-testid="input-edit-notes"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-notes">
                {parsed?.notes}
              </p>
            )}
          </div>
        )}

        {/* View PDF Button */}
        {!editing && (
          <Button
            onClick={handleViewPDF}
            variant="outline"
            className="w-full h-14 rounded-2xl text-base font-bold border-primary/20 text-primary"
            data-testid="button-view-pdf"
          >
            <Eye className="w-5 h-5 mr-2" /> View PDF
          </Button>
        )}

        {/* Edit Save Button */}
        {editing && (
          <Button
            onClick={handleSaveEdit}
            disabled={isUpdating}
            className="w-full h-14 rounded-2xl text-base font-bold"
            data-testid="button-save-edit"
          >
            {isUpdating ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Save Changes</>
            )}
          </Button>
        )}

        {/* Acknowledgment Gate */}
        {!editing && !isAcknowledged && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-700/40" data-testid="card-acknowledgment">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Review Required</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Before using this quote, please read all details carefully — including line items, pricing, GST, and notes. By acknowledging, you confirm you take full ownership and responsibility for all parts of this quote.
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4" data-testid="label-ack-checkbox">
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-amber-600"
                data-testid="input-ack-checkbox"
              />
              <span className="text-sm text-foreground leading-snug">
                I have carefully reviewed this quote and accept full ownership of all items, pricing, and details discussed.
              </span>
            </label>
            <Button
              onClick={handleAcknowledge}
              disabled={!ackChecked || isUpdating}
              className="w-full h-12 rounded-2xl text-sm font-bold bg-amber-600 text-white"
              data-testid="button-acknowledge"
            >
              {isUpdating ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirming...</>
              ) : (
                <><ShieldCheck className="w-5 h-5 mr-2" /> Acknowledge & Continue</>
              )}
            </Button>
          </div>
        )}

        {/* Acknowledged Badge */}
        {!editing && isAcknowledged && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-700/40" data-testid="badge-acknowledged">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Reviewed & acknowledged — you own this quote</span>
          </div>
        )}

        {/* Status Actions */}
        {!editing && isAcknowledged && (
          <div className="space-y-2">
            {quote.status === "draft" && (
              <Button
                onClick={() => handleStatusChange("sent")}
                disabled={isUpdating}
                className="w-full h-14 rounded-2xl text-base font-bold bg-blue-600 text-white"
                data-testid="button-mark-sent"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Mark as Sent
              </Button>
            )}
            {(quote.status === "sent" || quote.status === "viewed") && (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={isUpdating}
                  className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-accept-and-schedule"
                >
                  <Calendar className="w-5 h-5 mr-2" /> Accept & Schedule
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleStatusChange("accepted")}
                    disabled={isUpdating}
                    variant="outline"
                    className="h-12 rounded-2xl text-sm font-bold text-green-600 border-green-200 dark:border-green-900"
                    data-testid="button-mark-accepted"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept Only
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("rejected")}
                    disabled={isUpdating}
                    variant="outline"
                    className="h-12 rounded-2xl text-sm font-bold text-red-500 border-red-200 dark:border-red-900"
                    data-testid="button-mark-rejected"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Rejected
                  </Button>
                </div>
              </div>
            )}
            {quote.status === "accepted" && (
              <Button
                onClick={() => {
                  createInvoiceMutation.mutate(quote.id, {
                    onSuccess: (invoice: any) => {
                      setLocation(`/invoices/${invoice.id}`);
                    },
                  });
                }}
                disabled={createInvoiceMutation.isPending}
                className="w-full h-14 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createInvoiceMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Receipt className="w-5 h-5 mr-2" />}
                Create Invoice
              </Button>
            )}
            {(quote.status === "accepted" || quote.status === "rejected") && (
              <Button
                onClick={() => handleStatusChange("draft")}
                disabled={isUpdating}
                variant="outline"
                className="w-full h-12 rounded-2xl text-sm font-bold"
                data-testid="button-revert-draft"
              >
                Revert to Draft
              </Button>
            )}
            {!editing && scheduledJobId && quote.status === "accepted" && (
              <Button
                onClick={() => setLocation(`/jobs`)}
                variant="outline"
                className="w-full h-12 rounded-2xl text-sm font-bold border-primary/30 text-primary"
                data-testid="button-view-job"
              >
                <Calendar className="w-4 h-4 mr-2" /> View Scheduled Job
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Accept & Schedule Dialog */}
      <AcceptAndScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        quoteId={quote.id}
        totalAmount={totalAmount}
        initialTitle={jobTitle}
        initialCustomerId={resolvedCustomerId}
        initialSummary={parsed?.summary || ""}
        onSuccess={(newJobId) => {
          setScheduledJobId(newJobId);
          setShowScheduleDialog(false);
        }}
      />

      {/* Share Sheet Dialog */}
      <Dialog open={showShareSheet} onOpenChange={setShowShareSheet}>
        <DialogContent className="rounded-[2rem] mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Share Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                const customer = customers?.find(c => {
                  if (quote.jobId) {
                    const job = jobs?.find(j => j.id === quote.jobId);
                    return c.id === job?.customerId;
                  }
                  return false;
                });
                const email = customer?.email || "";
                if (!email) {
                  toast({ title: "No email on file", description: "Link this quote to a customer with an email address to use email share." });
                  setShowShareSheet(false);
                  return;
                }
                const subject = encodeURIComponent(`Quote: ${jobTitle}`);
                const body = encodeURIComponent(`Hi ${customer?.name || customerName || "there"},\n\nPlease find your quote for ${jobTitle} attached.\n\nTotal: $${totalAmount.toFixed(2)}\n\nView details: ${window.location.origin}/quotes/${quote.id}\n\nKind regards,\n[Your Name]`);
                window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                setShowShareSheet(false);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#F8F7F5] dark:bg-white/5 text-left hover-elevate active-elevate-2 transition-all"
              data-testid="button-share-email"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Email to Client</p>
                <p className="text-sm text-muted-foreground">Send directly to their inbox</p>
              </div>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#F8F7F5] dark:bg-white/5 text-left hover-elevate active-elevate-2 transition-all"
              data-testid="button-copy-link"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Copy Link</p>
                <p className="text-sm text-muted-foreground">Share a direct link to this quote</p>
              </div>
            </button>
            {quote.shareToken && (
              <button
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal/${quote.shareToken}`;
                  navigator.clipboard.writeText(portalUrl).then(() => {
                    toast({ title: "Portal link copied!", description: "Clients can accept or request changes from this link." });
                    setShowShareSheet(false);
                  });
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#F8F7F5] dark:bg-white/5 text-left hover-elevate active-elevate-2 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Client Portal Link</p>
                  <p className="text-sm text-muted-foreground">Client can accept or request changes</p>
                </div>
              </button>
            )}
            <button
              onClick={() => { setShowShareSheet(false); setLocation(`/quotes/${quote.id}/preview`); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#F8F7F5] dark:bg-white/5 text-left hover-elevate active-elevate-2 transition-all"
              data-testid="button-preview-export"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Preview & Export PDF</p>
                <p className="text-sm text-muted-foreground">View print-ready layout and save as PDF</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Acknowledgment Modal */}
      <Dialog open={ackDialogOpen} onOpenChange={setAckDialogOpen}>
        <DialogContent className="rounded-[2rem] mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Review Required</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Before using this quote, please read all details carefully — including line items, pricing, GST, and notes. By acknowledging, you confirm you take full ownership and responsibility for all parts of this quote.
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-ack-checkbox-modal">
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-amber-600"
                data-testid="input-ack-checkbox-modal"
              />
              <span className="text-sm text-foreground leading-snug">
                I have carefully reviewed this quote and accept full ownership of all items, pricing, and details discussed.
              </span>
            </label>
            <Button
              onClick={handleAcknowledge}
              disabled={!ackChecked || isUpdating}
              className="w-full h-12 rounded-2xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700"
              data-testid="button-acknowledge-modal"
            >
              {isUpdating ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirming...</>
              ) : (
                <><ShieldCheck className="w-5 h-5 mr-2" /> Acknowledge & Continue</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[2rem] mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Quote?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove this quote and all its line items. This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 h-12 rounded-xl font-bold"
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-bold bg-red-600 text-white"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
