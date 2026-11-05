import { useState } from "react";
import { useRoute } from "wouter";
import { usePortalQuote, usePortalAccept, usePortalDecline, usePortalFeedback } from "@/hooks/use-portal";
import { CheckCircle, MessageSquare, FileText, Loader2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { NO_GST_NOTE } from "@shared/gst-wording";
import { CustomerPageShell, Card, ORANGE } from "@/components/CustomerPageShell";

interface ParsedContent {
  jobTitle?: string;
  summary?: string;
  items?: { id?: string; description: string; quantity: number; unit?: string; unitPrice: number }[];
  notes?: string;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  includeGST?: boolean;
}

function parseContent(content: string | null): ParsedContent | null {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default function Portal() {
  const [, params] = useRoute("/portal/:token");
  const token = params?.token || "";
  const { data, isLoading, isError } = usePortalQuote(token);
  const { mutate: acceptQuote, isPending: isAccepting } = usePortalAccept(token);
  const { mutate: declineQuote, isPending: isDeclining } = usePortalDecline(token);
  const { mutate: sendFeedback, isPending: isSendingFeedback } = usePortalFeedback(token);

  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
      </div>
    );
  }

  if (isError || !data?.quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center max-w-md w-full">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-sm text-gray-500">
            This quote link may have expired or is no longer available.
            Please contact the tradesperson for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const { quote, customer, businessName } = data;
  const parsed = parseContent(quote.content);
  const items = parsed?.items || [];
  const subtotal = parsed?.subtotal ?? items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const gstAmount = parsed?.gstAmount ?? (parsed?.includeGST ? subtotal * 0.1 : 0);
  const includeGST = parsed?.includeGST ?? (gstAmount > 0);
  const totalAmount = Number(quote.totalAmount) || (subtotal + gstAmount);
  const quoteRef = `Q-${String(quote.id).padStart(4, "0")}`;
  const quoteDate = quote.createdAt ? format(new Date(quote.createdAt), "dd MMMM yyyy") : "N/A";
  // The server writes "declined"; this checked only for "rejected", so a customer
  // who declined and then reloaded the page was shown the Accept and Decline
  // buttons again as though nothing had happened. "rejected" is legacy — one row
  // in production — and both are treated as declined until that is migrated.
  // "invoiced" is past accepted, so it counts as accepted here too.
  const isAlreadyAccepted =
    quote.status === "accepted" || quote.status === "invoiced" || accepted;
  const isAlreadyDeclined =
    quote.status === "declined" || quote.status === "rejected" || declined;

  const handleAccept = () => {
    acceptQuote(preferredDate || undefined, {
      onSuccess: () => setAccepted(true),
    });
  };

  const handleDecline = () => {
    declineQuote(undefined, {
      onSuccess: () => setDeclined(true),
    });
  };

  const handleSendFeedback = () => {
    if (!feedbackMessage.trim()) return;
    sendFeedback(feedbackMessage.trim(), {
      onSuccess: () => {
        setFeedbackSent(true);
        setShowFeedback(false);
        setFeedbackMessage("");
      },
    });
  };

  const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const businessLogoUrl: string = (data as any).businessLogoUrl || "";
  const businessAbn: string = (data as any).businessAbn || "";

  return (
    <CustomerPageShell
      logoUrl={businessLogoUrl}
      businessName={businessName}
      eyebrow={`Quote ${quoteRef}`}
      title={parsed?.jobTitle || "Your quote"}
      meta={<>{quoteDate}{customer?.name ? ` · for ${customer.name}` : ""}</>}
    >
      {/* The total, first: it's what the customer opened this to see. */}
      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold" style={{ color: "rgba(28,29,33,0.66)" }}>Quote total</p>
            <p className="text-4xl font-extrabold tracking-tight" data-testid="text-total">{money(totalAmount)}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "rgba(28,29,33,0.66)" }}>
              {includeGST ? "Includes GST" : NO_GST_NOTE}
            </p>
          </div>
          {isAlreadyAccepted ? (
            <span className="rounded-full px-3 py-1 text-xs font-extrabold bg-green-100 text-green-800">Accepted</span>
          ) : isAlreadyDeclined ? (
            <span className="rounded-full px-3 py-1 text-xs font-extrabold bg-gray-200 text-gray-700">Declined</span>
          ) : null}
        </div>
        {parsed?.summary && <p className="text-[15px] leading-relaxed mt-4" style={{ color: "#3a3b40" }}>{parsed.summary}</p>}
      </Card>

      {/* Accept / decline: big, clear, near the top on a phone. */}
      {isAlreadyAccepted ? (
        <Card className="text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600" />
          <h2 className="text-lg font-extrabold">Quote accepted</h2>
          <p className="text-sm mt-1" style={{ color: "rgba(28,29,33,0.7)" }}>
            {businessName || "Your tradie"} has been told and will be in touch to book it in.
          </p>
        </Card>
      ) : isAlreadyDeclined ? (
        <Card className="text-center">
          <XCircle className="w-10 h-10 mx-auto mb-2 text-gray-500" />
          <h2 className="text-lg font-extrabold">Quote declined</h2>
          <p className="text-sm mt-1" style={{ color: "rgba(28,29,33,0.7)" }}>{businessName || "Your tradie"} has been told. Thanks for letting them know.</p>
        </Card>
      ) : (
        <Card>
          <label className="block text-[13px] font-bold mb-2" style={{ color: "rgba(28,29,33,0.66)" }} htmlFor="preferred-date">
            When would suit you? (optional)
          </label>
          <input
            id="preferred-date"
            type="date"
            value={preferredDate}
            onChange={e => setPreferredDate(e.target.value)}
            className="w-full h-12 rounded-2xl border px-4 text-base mb-4 focus:outline-none focus:ring-2"
            style={{ borderColor: "rgba(28,29,33,0.15)" }}
          />
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full h-14 rounded-2xl text-lg font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: ORANGE }}
            data-testid="button-accept"
          >
            {isAccepting ? <><Loader2 className="w-5 h-5 animate-spin" /> Accepting…</> : <><CheckCircle className="w-5 h-5" /> Accept quote</>}
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleDecline}
              disabled={isDeclining}
              className="h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 bg-white disabled:opacity-70"
              style={{ border: "1.5px solid rgba(28,29,33,0.18)", color: "#1C1D21" }}
              data-testid="button-decline"
            >
              {isDeclining ? <><Loader2 className="w-4 h-4 animate-spin" /> Declining…</> : <><XCircle className="w-4 h-4" /> Decline</>}
            </button>
            <button
              onClick={() => setShowFeedback(v => !v)}
              className="h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 bg-white"
              style={{ border: "1.5px solid rgba(28,29,33,0.18)", color: "#1C1D21" }}
              data-testid="button-request-changes"
            >
              <MessageSquare className="w-4 h-4" /> Ask for changes
            </button>
          </div>
          {showFeedback && (
            <div className="mt-4 space-y-2">
              <Textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="What would you like changed?"
                className="min-h-[100px] resize-none rounded-2xl text-base"
                disabled={isSendingFeedback}
              />
              <button
                onClick={handleSendFeedback}
                disabled={isSendingFeedback || !feedbackMessage.trim()}
                className="w-full h-12 rounded-2xl text-sm font-extrabold text-white disabled:opacity-60"
                style={{ background: "#1C1D21" }}
              >
                {isSendingFeedback ? "Sending…" : "Send to " + (businessName || "your tradie")}
              </button>
            </div>
          )}
        </Card>
      )}

      {feedbackSent && (
        <Card className="text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: ORANGE }} />
          <h3 className="text-base font-extrabold">Sent</h3>
          <p className="text-sm mt-1" style={{ color: "rgba(28,29,33,0.7)" }}>{businessName || "Your tradie"} will look at your changes and get back to you.</p>
        </Card>
      )}

      {/* What's included */}
      <Card label="What's included">
        <ul className="divide-y" style={{ borderColor: "rgba(28,29,33,0.08)" }}>
          {items.map((item, idx) => (
            <li key={idx} className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{item.description}</p>
                <p className="text-sm" style={{ color: "rgba(28,29,33,0.62)" }}>
                  {item.quantity}{item.unit ? ` ${item.unit}` : ""} × {money(item.unitPrice)}
                </p>
              </div>
              <p className="font-bold whitespace-nowrap">{money(item.quantity * item.unitPrice)}</p>
            </li>
          ))}
          {items.length === 0 && <li className="py-4 text-center italic" style={{ color: "rgba(28,29,33,0.5)" }}>No line items</li>}
        </ul>
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "2px solid #1C1D21" }}>
          {includeGST && (
            <>
              <div className="flex justify-between text-sm" style={{ color: "rgba(28,29,33,0.7)" }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-sm" style={{ color: "rgba(28,29,33,0.7)" }}><span>GST (10%)</span><span>{money(gstAmount)}</span></div>
            </>
          )}
          <div className="flex justify-between items-baseline">
            <span className="font-extrabold">Total {includeGST ? "(inc. GST)" : ""}</span>
            <span className="text-2xl font-extrabold">{money(totalAmount)}</span>
          </div>
          {!includeGST && <p className="text-xs text-right" style={{ color: "rgba(28,29,33,0.6)" }}>{NO_GST_NOTE}</p>}
        </div>
      </Card>

      {parsed?.notes && (
        <Card label="Notes">
          <p className="text-[15px] whitespace-pre-wrap leading-relaxed" style={{ color: "#3a3b40" }}>{parsed.notes}</p>
        </Card>
      )}

      {/* Who it's from */}
      <Card label="From">
        <p className="font-extrabold">{businessName || "Your tradie"}</p>
        {businessAbn && <p className="text-sm" style={{ color: "rgba(28,29,33,0.7)" }}>ABN {businessAbn}</p>}
        {(data as any).businessPhone && <p className="text-sm"><a className="font-semibold underline" href={`tel:${(data as any).businessPhone}`}>{(data as any).businessPhone}</a></p>}
        {(data as any).businessEmail && <p className="text-sm"><a className="font-semibold underline" href={`mailto:${(data as any).businessEmail}`}>{(data as any).businessEmail}</a></p>}
        {(data as any).businessAddress && <p className="text-sm" style={{ color: "rgba(28,29,33,0.7)" }}>{(data as any).businessAddress}</p>}
      </Card>
    </CustomerPageShell>
  );
}
