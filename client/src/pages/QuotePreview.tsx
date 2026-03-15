import { useQuotes } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ParsedContent {
  jobTitle?: string;
  summary?: string;
  items?: { id?: string; description: string; quantity: number; unit?: string; unitPrice: number }[];
  notes?: string;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  includeGST?: boolean;
  callOutFee?: number;
  markupPercent?: number;
}

function parseContent(content: string | null): ParsedContent | null {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default function QuotePreview() {
  const [, params] = useRoute("/quotes/:id/preview");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: quotes, isLoading } = useQuotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();

  const quote = quotes?.find(q => q.id === id);
  const parsed = quote ? parseContent(quote.content) : null;

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
        <Button variant="ghost" onClick={() => setLocation("/quotes")} className="mt-4" data-testid="button-back-quotes">
          Back to Quotes
        </Button>
      </div>
    );
  }

  const customerName = (() => {
    if (parsed?.notes) {
      const match = (parsed.notes as string).match(/Quote for:\s*(.+?)[\.\n]/);
      if (match) return match[1].trim();
    }
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) {
        const customer = customers?.find(c => c.id === job.customerId);
        if (customer) return customer.name;
      }
    }
    return null;
  })();

  const customerDetails = (() => {
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) {
        const customer = customers?.find(c => c.id === job.customerId);
        if (customer) return customer;
      }
    }
    return null;
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
  const quoteDate = quote.createdAt ? format(new Date(quote.createdAt), "dd MMMM yyyy") : "N/A";
  const quoteRef = `Q-${String(quote.id).padStart(4, "0")}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Toolbar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/quotes/${id}`)}
            data-testid="button-back-detail"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-sm text-foreground">Quote Preview</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl"
              data-testid="button-print"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-4 print:p-0 print:max-w-none">
        <div
          className="bg-white dark:bg-white text-black rounded-2xl print:rounded-none shadow-lg print:shadow-none overflow-hidden"
          data-testid="quote-document"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 sm:px-8 py-8 print:px-10 print:py-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">QUOTE</h1>
                <p className="text-orange-100 text-sm mt-1 font-medium">{quoteRef}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">Vargenezey</p>
                <p className="text-xs text-orange-100 mt-0.5">Professional Trade Services</p>
                <p className="text-xs text-orange-100">ABN: XX XXX XXX XXX</p>
              </div>
            </div>
          </div>

          {/* Quote Info Bar */}
          <div className="px-4 sm:px-8 py-5 print:px-10 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Date</p>
              <p className="font-semibold mt-0.5">{quoteDate}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Status</p>
              <p className="font-semibold mt-0.5 capitalize">{quote.status}</p>
            </div>
          </div>

          {/* Customer & Job Info */}
          <div className="px-4 sm:px-8 py-6 print:px-10 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Quote To</p>
                {customerName && <p className="font-bold text-base">{customerName}</p>}
                {customerDetails?.email && <p className="text-sm text-gray-600 mt-0.5">{customerDetails.email}</p>}
                {customerDetails?.phone && <p className="text-sm text-gray-600">{customerDetails.phone}</p>}
                {customerDetails?.address && <p className="text-sm text-gray-600">{customerDetails.address}</p>}
                {!customerName && <p className="text-sm text-gray-400 italic">No customer specified</p>}
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Job Description</p>
                <p className="font-bold text-base">{jobTitle}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="px-4 sm:px-8 py-6 print:px-10 overflow-x-hidden">
            <table className="w-full text-sm table-fixed" data-testid="table-line-items">
              <colgroup>
                <col className="w-auto" />
                <col style={{ width: "2.5rem" }} />
                <col style={{ width: "4.5rem" }} />
                <col style={{ width: "4.5rem" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-center py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Qty</th>
                  <th className="text-right py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Rate</th>
                  <th className="text-right py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100" data-testid={`row-item-${idx}`}>
                    <td className="py-3 text-gray-800 break-words min-w-0">
                      {item.description}
                      {item.unit && <span className="text-gray-400 text-xs ml-1">({item.unit})</span>}
                    </td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium text-gray-800">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 italic">No line items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-4 sm:px-8 pb-6 print:px-10">
            <div className="ml-auto max-w-xs">
              <div className="flex justify-between py-2 text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {includeGST && (
                <div className="flex justify-between py-2 text-sm text-gray-600">
                  <span>GST (10%)</span>
                  <span className="font-medium">${gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-800 mt-1">
                <span className="text-base font-bold">Total {includeGST ? "(inc. GST)" : "(ex. GST)"}</span>
                <span className="text-xl font-bold" data-testid="text-total">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {parsed?.notes && (
            <div className="px-4 sm:px-8 py-5 print:px-10 bg-gray-50 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="text-notes">{parsed.notes}</p>
            </div>
          )}

          {/* Terms & Footer */}
          <div className="px-4 sm:px-8 py-6 print:px-10 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</p>
            <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
              <li>This quote is valid for 30 days from the date of issue.</li>
              <li>Payment terms: 50% deposit required before commencement, balance due on completion.</li>
              <li>Prices are in Australian Dollars (AUD){includeGST ? " and include GST" : ""}.</li>
              <li>Additional work outside the scope of this quote will be charged at agreed rates.</li>
            </ul>
          </div>

          {/* Footer Bar */}
          <div className="bg-gray-800 text-white px-4 sm:px-8 py-4 print:px-10 text-center">
            <p className="text-xs text-gray-400">Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
}
