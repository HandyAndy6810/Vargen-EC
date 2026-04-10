import { useState } from "react";
import { useRoute } from "wouter";
import { usePortalQuote, usePortalAccept, usePortalDecline, usePortalFeedback } from "@/hooks/use-portal";
import { CheckCircle, MessageSquare, FileText, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const isAlreadyAccepted = quote.status === "accepted" || accepted;
  const isAlreadyDeclined = quote.status === "rejected" || declined;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {businessName || "Quote"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{quoteRef}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{quoteDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Customer Info */}
        {customer && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Prepared For</p>
            <p className="font-bold text-gray-900">{customer.name}</p>
            {customer.email && <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
            {customer.address && <p className="text-sm text-gray-500">{customer.address}</p>}
          </div>
        )}

        {/* Job Title */}
        {parsed?.jobTitle && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Job Description</p>
            <p className="font-semibold text-gray-900">{parsed.jobTitle}</p>
            {parsed.summary && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{parsed.summary}</p>
            )}
          </div>
        )}

        {/* Line Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="font-bold text-gray-900">Items</h2>
          </div>
          <div className="px-5 pb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-center py-3 font-bold text-gray-500 text-xs uppercase tracking-wider w-16">Qty</th>
                  <th className="text-right py-3 font-bold text-gray-500 text-xs uppercase tracking-wider w-20">Rate</th>
                  <th className="text-right py-3 font-bold text-gray-500 text-xs uppercase tracking-wider w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-3 text-gray-800">
                      {item.description}
                      {item.unit && <span className="text-gray-400 text-xs ml-1">({item.unit})</span>}
                    </td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium text-gray-800">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-5 pb-5 pt-2">
            <div className="ml-auto max-w-xs space-y-1">
              <div className="flex justify-between py-1.5 text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">${subtotal.toFixed(2)}</span>
              </div>
              {includeGST && (
                <div className="flex justify-between py-1.5 text-sm text-gray-500">
                  <span>GST (10%)</span>
                  <span className="font-medium text-gray-700">${gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-800 mt-2">
                <span className="text-base font-bold text-gray-900">
                  Total {includeGST ? "(inc. GST)" : "(ex. GST)"}
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {parsed?.notes && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{parsed.notes}</p>
          </div>
        )}

        {/* Actions */}
        {isAlreadyAccepted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <h3 className="text-lg font-bold text-green-800">Quote Accepted!</h3>
            <p className="text-sm text-green-600 mt-1">
              The tradesperson has been notified and will be in touch soon.
            </p>
          </div>
        ) : isAlreadyDeclined ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-red-800">Quote Declined</h3>
            <p className="text-sm text-red-600 mt-1">
              The tradesperson has been notified.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Optional preferred date */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferred Start Date (optional)</p>
              <input
                type="date"
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              {isAccepting ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Accepting...</>
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Accept Quote</>
              )}
            </Button>

            <Button
              onClick={handleDecline}
              disabled={isDeclining}
              variant="outline"
              className="w-full h-12 rounded-2xl text-sm font-bold border-red-200 text-red-600 hover:bg-red-50"
            >
              {isDeclining ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Declining...</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" /> Decline Quote</>
              )}
            </Button>

            {showFeedback ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm">Request Changes</h3>
                <Textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Describe the changes you'd like..."
                  className="min-h-[100px] resize-none rounded-xl border-gray-200 text-sm"
                  disabled={isSendingFeedback}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowFeedback(false); setFeedbackMessage(""); }}
                    className="flex-1 h-11 rounded-xl font-bold text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendFeedback}
                    disabled={isSendingFeedback || !feedbackMessage.trim()}
                    className="flex-1 h-11 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSendingFeedback ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                    ) : (
                      "Send Feedback"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowFeedback(true)}
                className="w-full h-12 rounded-2xl text-sm font-bold border-gray-200"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Request Changes
              </Button>
            )}
          </div>
        )}

        {/* Feedback sent confirmation */}
        {feedbackSent && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <h3 className="text-sm font-bold text-blue-800">Feedback Sent</h3>
            <p className="text-xs text-blue-600 mt-1">
              The tradesperson will review your request and get back to you.
            </p>
          </div>
        )}

        {/* Footer spacing */}
        <div className="pb-8" />
      </div>
    </div>
  );
}
