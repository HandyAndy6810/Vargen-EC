import { useRoute, useLocation } from "wouter";
import { useInvoice } from "@/hooks/use-invoices";
import { useCustomer } from "@/hooks/use-customers";
import { useUserSettings } from "@/hooks/use-user-settings";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

export default function InvoicePreview() {
  const [, params] = useRoute("/invoices/:id/preview");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { data: invoice, isLoading } = useInvoice(id);
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
  const invoiceDate = invoice.createdAt ? format(new Date(invoice.createdAt), "dd MMMM yyyy") : "N/A";
  const dueDate = invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMMM yyyy") : null;
  const paidDate = invoice.paidDate ? format(new Date(invoice.paidDate), "dd MMMM yyyy") : null;

  const bankName = settings?.bankName || "";
  const bankBsb = settings?.bankBsb || "";
  const bankAccountNumber = settings?.bankAccountNumber || "";
  const bankAccountName = settings?.bankAccountName || "";
  const hasBankDetails = bankName || bankBsb || bankAccountNumber;

  const businessName = settings?.businessName || "Vargenezey";

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
            onClick={() => setLocation(`/invoices/${id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-sm text-foreground">Invoice Preview</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white dark:bg-white text-black rounded-2xl print:rounded-none shadow-lg print:shadow-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-8 py-8 print:px-10 print:py-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
                <p className="text-blue-100 text-sm mt-1 font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{businessName}</p>
                {settings?.tradeType && <p className="text-xs text-blue-100 mt-0.5">{settings.tradeType}</p>}
                {settings?.abn && <p className="text-xs text-blue-100">ABN: {settings.abn}</p>}
              </div>
            </div>
          </div>

          {/* Invoice Info Bar */}
          <div className="px-4 sm:px-8 py-5 print:px-10 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Date</p>
              <p className="font-semibold mt-0.5">{invoiceDate}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Status</p>
              <p className="font-semibold mt-0.5 capitalize">{invoice.status || "draft"}</p>
            </div>
            {dueDate && (
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Due Date</p>
                <p className="font-semibold mt-0.5 text-red-600">{dueDate}</p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="px-4 sm:px-8 py-6 print:px-10 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Bill To</p>
                {customer ? (
                  <>
                    <p className="font-bold text-base">{customer.name}</p>
                    {customer.email && <p className="text-sm text-gray-600 mt-0.5">{customer.email}</p>}
                    {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
                    {customer.address && <p className="text-sm text-gray-600">{customer.address}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">No customer specified</p>
                )}
              </div>
              {invoice.status === "paid" && paidDate && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Payment</p>
                  <p className="font-bold text-base text-green-600">Paid</p>
                  <p className="text-sm text-gray-600 mt-0.5">{paidDate}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="px-4 sm:px-8 py-6 print:px-10 overflow-x-hidden">
            <table className="w-full text-sm table-fixed">
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
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 text-gray-800 break-words min-w-0">
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
                <span className="text-xl font-bold">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {hasBankDetails && (
            <div className="px-4 sm:px-8 py-5 print:px-10 bg-blue-50 border-t border-blue-100">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Payment Details</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {bankName && (
                  <>
                    <span className="text-blue-600">Bank</span>
                    <span className="font-medium text-gray-800">{bankName}</span>
                  </>
                )}
                {bankBsb && (
                  <>
                    <span className="text-blue-600">BSB</span>
                    <span className="font-medium text-gray-800">{bankBsb}</span>
                  </>
                )}
                {bankAccountNumber && (
                  <>
                    <span className="text-blue-600">Account Number</span>
                    <span className="font-medium text-gray-800">{bankAccountNumber}</span>
                  </>
                )}
                {bankAccountName && (
                  <>
                    <span className="text-blue-600">Account Name</span>
                    <span className="font-medium text-gray-800">{bankAccountName}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Due Date Highlight */}
          {dueDate && invoice.status !== "paid" && (
            <div className="px-4 sm:px-8 py-4 print:px-10 bg-red-50 border-t border-red-100 text-center">
              <p className="text-sm font-bold text-red-700">
                Payment due by {dueDate}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="px-4 sm:px-8 py-5 print:px-10 bg-gray-50 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {/* Footer Bar */}
          <div className="bg-gray-800 text-white px-4 sm:px-8 py-4 print:px-10 text-center">
            <p className="text-xs text-gray-400">Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
}
