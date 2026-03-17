import { useState } from "react";
import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useLocation } from "wouter";
import { FileText, DollarSign, Clock, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isAfter, startOfMonth } from "date-fns";

type FilterTab = "all" | "draft" | "sent" | "paid" | "overdue";

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<FilterTab>("all");

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return "No customer";
    const customer = customers?.find(c => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const filteredInvoices = invoices
    ?.filter(inv => tab === "all" || inv.status === tab)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }) || [];

  const totalOutstanding = invoices
    ?.filter(inv => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) || 0;

  const monthStart = startOfMonth(new Date());
  const paidThisMonth = invoices
    ?.filter(inv => inv.status === "paid" && inv.paidDate && isAfter(new Date(inv.paidDate), monthStart))
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) || 0;

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "sent":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "overdue":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-6 pt-12 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          {invoices && (
            <span className="text-sm font-bold text-muted-foreground">
              {invoices.length} total
            </span>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Outstanding</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Paid This Month</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              ${paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 mb-6">
        <div className="bg-[#F0EEEB] dark:bg-white/10 p-1 rounded-2xl flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap px-3",
                tab === t.key
                  ? "bg-white dark:bg-white/20 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div className="px-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-12 text-center shadow-sm border border-black/5 dark:border-white/10">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="font-medium text-muted-foreground">
              {tab === "all"
                ? "No invoices yet"
                : `No ${tab} invoices`}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {tab === "all"
                ? "Create your first invoice from an accepted quote."
                : `Invoices with "${tab}" status will appear here.`}
            </p>
          </div>
        ) : (
          filteredInvoices.map(invoice => (
            <div
              key={invoice.id}
              onClick={() => setLocation(`/invoices/${invoice.id}`)}
              className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {getCustomerName(invoice.customerId)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg text-foreground">
                    ${Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 gap-2">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                  statusBadge(invoice.status)
                )}>
                  {invoice.status || "draft"}
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {invoice.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                    </span>
                  )}
                  {invoice.status === "paid" && invoice.paidDate && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      Paid {format(new Date(invoice.paidDate), "dd MMM")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
