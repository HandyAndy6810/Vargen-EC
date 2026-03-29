import { useQuotes } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useRoute, useLocation } from "wouter";
import { useEffect } from "react";
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
  try { return JSON.parse(content); } catch { return null; }
}

function darkenColor(hex: string, amount = 35): string {
  const clean = hex.replace("#", "");
  const r = Math.max(0, parseInt(clean.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(clean.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(clean.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  playfair: "'Playfair Display', serif",
  roboto: "'Roboto', sans-serif",
  lato: "'Lato', sans-serif",
};

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap";

export default function QuotePreview() {
  const [, params] = useRoute("/quotes/:id/preview");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: quotes, isLoading } = useQuotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();
  const { data: settings } = useUserSettings();

  // Load Google Fonts
  useEffect(() => {
    const existing = document.getElementById("quote-preview-fonts");
    if (!existing) {
      const link = document.createElement("link");
      link.id = "quote-preview-fonts";
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

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

  // Branding
  const accentColor = settings?.quoteAccentColor || "#ea580c";
  const fontFamily = FONT_MAP[settings?.quoteFontFamily || "inter"] || FONT_MAP.inter;
  const logoUrl = settings?.logoUrl || "";
  const headerStyle = settings?.quoteHeaderStyle || "gradient";
  const businessName = settings?.businessName || "Your Business";

  const initials = businessName
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const headerBg =
    headerStyle === "gradient"
      ? `linear-gradient(135deg, ${accentColor}, ${darkenColor(accentColor)})`
      : headerStyle === "minimal"
      ? "#f8f8f8"
      : accentColor;

  const isMinimal = headerStyle === "minimal";
  const headerText = isMinimal ? accentColor : "#ffffff";
  const headerSub = isMinimal ? `${accentColor}99` : "rgba(255,255,255,0.8)";

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900" style={{ fontFamily }}>
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/quotes/${id}`)} data-testid="button-back-detail">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-sm text-foreground">Quote Preview</span>
          <Button variant="outline" onClick={handlePrint} className="rounded-xl" data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white text-black rounded-2xl print:rounded-none shadow-lg print:shadow-none overflow-hidden" data-testid="quote-document" style={{ fontFamily }}>

          {/* Header */}
          <div style={{ background: headerBg }} className="px-4 sm:px-8 py-8 print:px-10 print:py-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: headerText }}>QUOTE</h1>
                <p className="text-sm mt-1 font-medium" style={{ color: headerSub }}>{quoteRef}</p>
              </div>

              {/* Logo or business identity */}
              <div className="flex flex-col items-end gap-1.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={businessName}
                    className="h-12 max-w-[140px] object-contain"
                    style={{ filter: isMinimal ? "none" : "brightness(0) invert(1)" }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: isMinimal ? accentColor : "rgba(255,255,255,0.2)", color: isMinimal ? "#fff" : headerText }}
                  >
                    {initials}
                  </div>
                )}
                <p className="text-sm font-bold" style={{ color: headerText }}>{businessName}</p>
                {settings?.tradeType && <p className="text-xs" style={{ color: headerSub }}>{settings.tradeType}</p>}
                {settings?.abn && <p className="text-xs" style={{ color: headerSub }}>ABN: {settings.abn}</p>}
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

          {/* Line Items */}
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
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400 italic">No line items</td></tr>
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
              <div className="flex justify-between py-3 border-t-2 mt-1" style={{ borderColor: accentColor }}>
                <span className="text-base font-bold">Total {includeGST ? "(inc. GST)" : "(ex. GST)"}</span>
                <span className="text-xl font-bold" style={{ color: accentColor }} data-testid="text-total">${totalAmount.toFixed(2)}</span>
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

          {/* Terms */}
          <div className="px-4 sm:px-8 py-6 print:px-10 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</p>
            <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
              <li>This quote is valid for 30 days from the date of issue.</li>
              <li>Payment terms: 50% deposit required before commencement, balance due on completion.</li>
              <li>Prices are in Australian Dollars (AUD){includeGST ? " and include GST" : ""}.</li>
              <li>Additional work outside the scope of this quote will be charged at agreed rates.</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-white px-4 sm:px-8 py-4 print:px-10 text-center" style={{ background: darkenColor(accentColor, 50) }}>
            <p className="text-xs opacity-70">Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
}
