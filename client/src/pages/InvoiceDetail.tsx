import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { useCustomer } from "@/hooks/use-customers";
import { useUserSettings } from "@/hooks/use-user-settings";
import { ArrowLeft, Download, Send, CheckCircle, DollarSign, Building, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

interface ParsedItem {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

function parseItems(itemsJson: string | null): ParsedItem[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: invoice, isLoading } = useInvoice(id);
  const { mutate: updateInvoice, isPending: isUpdating } = useUpdateInvoice();
  const customerId = invoice?.customerId || 0;
  const { data: customer } = useCustomer(customerId);
  const { data: settings } = useUserSettings();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-lg font-medium text-muted-foreground">Invoice not found</p>
        <Button variant="ghost" onClick={() => setLocation("/invoices")} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const items = parseItems(invoice.items);
  const subtotal = Number(invoice.subtotal) || 0;
  const gstAmount = Number(invoice.gstAmount) || 0;
  const totalAmount = Number(invoice.totalAmount) || 0;
  const includeGST = gstAmount > 0;
  const invoiceDate = invoice.createdAt ? format(new Date(invoice.createdAt), "dd MMM yyyy") : "N/A";
  const dueDate = invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMMM yyyy") : null;
  const paidDate = invoice.paidDate ? format(new Date(invoice.paidDate), "dd MMM yyyy") : null;

  const statusColor = (status: string | null) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "sent": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "paid": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "overdue": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [paymentReference, setPaymentReference] = useState("");

  const PAYMENT_METHODS = [
    { value: "bank", label: "Bank Transfer" },
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "cheque", label: "Cheque" },
  ];

  const handleMarkSent = () => {
    updateInvoice({ id: invoice.id, status: "sent" });
  };

  const handleConfirmPaid = () => {
    const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
    const paymentNote = `Paid via ${methodLabel}${paymentReference ? ` — Ref: ${paymentReference}` : ""}`;
    const updatedNotes = invoice.notes ? `${invoice.notes}\n${paymentNote}` : paymentNote;
    updateInvoice(
      { id: invoice.id, status: "paid", paidDate: new Date().toISOString(), notes: updatedNotes } as any,
      { onSuccess: () => { setShowPaymentDialog(false); setPaymentReference(""); setPaymentMethod("bank"); } }
    );
  };

  const bankName = settings?.bankName || "";
  const bankBsb = settings?.bsb || "";
  const bankAccountNumber = settings?.accountNumber || "";
  const bankAccountName = settings?.accountName || "";
  const hasBankDetails = bankName || bankBsb || bankAccountNumber;

  const handleDownloadPDF = () => {
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

    // Header — business details (left) + INVOICE label (right)
    const businessName = settings?.businessName || "";
    const businessAbn = settings?.abn || "";
    const businessPhone = settings?.phone || "";
    const businessEmail = settings?.email || "";
    const businessAddress = settings?.address || "";

    if (businessName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(businessName, margin, y);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", pageWidth - margin, y, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (businessAbn) { doc.text(`ABN: ${businessAbn}`, margin, y); y += 5; }
    if (businessPhone) { doc.text(businessPhone, margin, y); y += 5; }
    if (businessEmail) { doc.text(businessEmail, margin, y); y += 5; }
    if (businessAddress) {
      const addrLines = doc.splitTextToSize(businessAddress, contentWidth * 0.5);
      addrLines.forEach((line: string) => { doc.text(line, margin, y); y += 5; });
    }

    // Invoice meta on right side
    const metaY = 32;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(invoice.invoiceNumber, pageWidth - margin, metaY, { align: "right" });
    doc.text(invoiceDate, pageWidth - margin, metaY + 5, { align: "right" });
    if (dueDate) doc.text(`Due: ${dueDate}`, pageWidth - margin, metaY + 10, { align: "right" });

    y = Math.max(y, metaY + 18) + 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Customer
    if (customer) {
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("BILL TO", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(customer.name, margin, y);
      y += 5;
      if (customer.email) { doc.text(customer.email, margin, y); y += 5; }
      if (customer.phone) { doc.text(customer.phone, margin, y); y += 5; }
      if (customer.address) { doc.text(customer.address, margin, y); y += 5; }
      y += 5;
    }

    y += 5;

    // Line Items
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

    // Totals
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
    y += 14;

    // Bank Details
    if (hasBankDetails) {
      checkPageBreak(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Payment Details", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      if (bankName) { doc.text(`Bank: ${bankName}`, margin, y); y += 5; }
      if (bankBsb) { doc.text(`BSB: ${bankBsb}`, margin, y); y += 5; }
      if (bankAccountNumber) { doc.text(`Account: ${bankAccountNumber}`, margin, y); y += 5; }
      if (bankAccountName) { doc.text(`Account Name: ${bankAccountName}`, margin, y); y += 5; }
      y += 5;
    }

    // Due Date
    if (dueDate) {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(200, 50, 50);
      doc.text(`Payment due by: ${dueDate}`, margin, y);
    }

    // Notes
    if (invoice.notes) {
      y += 10;
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Notes", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
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

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setLocation("/invoices")} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <span className="font-bold text-sm text-foreground">Invoice Detail</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-6 space-y-5">
        {/* Invoice Header Card */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{invoiceDate}</p>
            </div>
            <span className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-full capitalize",
              statusColor(invoice.status)
            )}>
              {invoice.status || "draft"}
            </span>
          </div>
          {dueDate && invoice.status !== "paid" && (
            <p className="text-sm text-muted-foreground">
              Payment due by <span className="font-semibold text-foreground">{dueDate}</span>
            </p>
          )}
          {invoice.status === "paid" && paidDate && (
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Paid on {paidDate}
              </span>
            </div>
          )}
        </div>

        {/* Source Quote Link */}
        {invoice.quoteId && (
          <button
            onClick={() => setLocation(`/quotes/${invoice.quoteId}`)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm text-left active:scale-[0.98] transition-transform"
          >
            <Building className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground flex-1">View Original Quote</span>
            <span className="text-xs text-muted-foreground">→</span>
          </button>
        )}

        {/* Customer Card */}
        {customer && (
          <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
            <h2 className="font-bold text-foreground mb-3">Customer</h2>
            <p className="font-semibold text-foreground">{customer.name}</p>
            {customer.email && <p className="text-sm text-muted-foreground mt-0.5">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
            {customer.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
          </div>
        )}

        {/* Line Items */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="font-bold text-foreground mb-4">Line Items</h2>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No line items</p>
            ) : (
              items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit || "x"} @ ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
          <h2 className="font-bold text-foreground mb-3">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            {includeGST && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (10%)</span>
                <span className="font-medium text-foreground">${gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-black/5 dark:border-white/10 pt-2 flex justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {hasBankDetails && (
          <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-bold text-foreground">Payment Details</h2>
            </div>
            <div className="space-y-1.5 text-sm">
              {bankName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium text-foreground">{bankName}</span>
                </div>
              )}
              {bankBsb && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BSB</span>
                  <span className="font-medium text-foreground">{bankBsb}</span>
                </div>
              )}
              {bankAccountNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-medium text-foreground">{bankAccountNumber}</span>
                </div>
              )}
              {bankAccountName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-medium text-foreground">{bankAccountName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10">
            <h2 className="font-bold text-foreground mb-3">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {invoice.status === "draft" && (
            <div className="space-y-2">
              <Button
                onClick={handleMarkSent}
                disabled={isUpdating}
                className="w-full h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isUpdating ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Sending...</>
                ) : (
                  <><Send className="w-5 h-5 mr-2" /> Send to Customer</>
                )}
              </Button>
              {customer?.email && (
                <p className="text-xs text-center text-muted-foreground">
                  Invoice will be emailed to {customer.email}
                </p>
              )}
            </div>
          )}

          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button
              onClick={() => setShowPaymentDialog(true)}
              disabled={isUpdating}
              className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              <DollarSign className="w-5 h-5 mr-2" /> Record Payment
            </Button>
          )}

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="w-full h-14 rounded-2xl text-base font-bold border-primary/20 text-primary"
          >
            <Download className="w-5 h-5 mr-2" /> Download PDF
          </Button>

          <Button
            onClick={() => setLocation(`/invoices/${invoice.id}/preview`)}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm font-bold"
          >
            View Print Preview
          </Button>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="text-2xl font-bold text-foreground">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      "h-11 rounded-xl text-sm font-semibold border transition-all",
                      paymentMethod === m.value
                        ? "bg-primary text-white border-primary"
                        : "bg-transparent text-foreground border-black/10 dark:border-white/10"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. receipt number, transaction ID"
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleConfirmPaid}
              disabled={isUpdating}
              className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</> : <><CheckCircle className="w-5 h-5 mr-2" /> Confirm Payment</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
