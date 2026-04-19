import { useState } from "react";
import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useLocation } from "wouter";
import { FileText, DollarSign, Clock, CheckCircle, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isAfter, startOfMonth } from "date-fns";
import { NewInvoiceSheet } from "@/components/NewInvoiceSheet";

type FilterTab = "all" | "draft" | "sent" | "partial" | "paid" | "overdue";

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<FilterTab>("all");
  const [showNew, setShowNew] = useState(false);

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
    ?.filter(inv => ["sent", "overdue", "partial"].includes(inv.status || ""))
    .reduce((sum, inv) => {
      const paid = Number((inv as any).paidAmount || 0);
      return sum + Math.max(Number(inv.totalAmount || 0) - paid, 0);
    }, 0) || 0;

  const monthStart = startOfMonth(new Date());
  const paidThisMonth = invoices
    ?.filter(inv => inv.status === "paid" && inv.paidDate && isAfter(new Date(inv.paidDate), monthStart))
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) || 0;

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "draft":   return "bg-[rgba(20,19,16,0.06)] text-[rgba(20,19,16,0.55)] border border-[rgba(20,19,16,0.10)] dark:bg-white/8 dark:text-white/50 dark:border-white/10";
      case "sent":    return "bg-blueSoft text-blueStatus border border-[#c8dcff] dark:bg-[rgba(90,156,255,0.15)] dark:text-[#5a9cff] dark:border-[rgba(90,156,255,0.3)]";
      case "partial": return "bg-orangeSoft text-primary border border-[#fcc9a8] dark:bg-[rgba(242,106,42,0.18)] dark:border-[rgba(242,106,42,0.3)]";
      case "paid":    return "bg-greenSoft text-greenStatus border border-[#bde2c9] dark:bg-[rgba(78,196,114,0.15)] dark:text-[#4ec472] dark:border-[rgba(78,196,114,0.3)]";
      case "overdue": return "bg-redSoft text-red-600 border border-[#f5c6c6] dark:bg-[rgba(255,106,106,0.15)] dark:text-[#ff6a6a] dark:border-[rgba(255,106,106,0.3)]";
      default:        return "bg-muted/50 text-muted-foreground border border-transparent";
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "partial", label: "Partial" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-5 pt-12 mb-4">
        {/* Dark hero card — outstanding amount */}
        <div className="header-card mb-4" style={{ background: "linear-gradient(135deg, #1a1400 0%, #0f0e0b 60%)" }}>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-white/40">
                $ Getting Paid
              </p>
              <button
                onClick={() => setShowNew(true)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-all"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-[42px] font-extrabold text-white leading-none tracking-[-1.4px] mb-1">
              ${totalOutstanding.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-white/50 text-[13px] mb-4">
              {(invoices?.filter(i => ["sent", "overdue", "partial"].includes(i.status || "")) || []).length} outstanding · {invoices?.length || 0} total
            </p>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#4ec472]" />
              <p className="text-[13px] font-semibold text-white/60">
                ${paidThisMonth.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid this month
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-[10px] font-extrabold text-[12px] transition-all whitespace-nowrap",
                tab === t.key
                  ? "bg-card text-foreground shadow-sm border border-black/8 dark:border-white/8"
                  : "bg-paperDeep dark:bg-muted text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div className="px-5 space-y-2">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-card rounded-[22px] p-12 text-center border border-black/5 dark:border-white/8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="font-bold text-foreground">
              {tab === "all" ? "No invoices yet" : `No ${tab} invoices`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "all" && "Tap + to create one, or create from an accepted quote."}
              {tab === "draft" && "Drafts appear here before you send them."}
              {tab === "sent" && "Invoices waiting on payment will appear here."}
              {tab === "partial" && "Invoices with a partial payment appear here."}
              {tab === "paid" && "Fully paid invoices will appear here."}
              {tab === "overdue" && "Invoices past their due date appear here automatically."}
            </p>
          </div>
        ) : (
          filteredInvoices.map(invoice => (
            <div
              key={invoice.id}
              onClick={() => setLocation(`/invoices/${invoice.id}`)}
              className="bg-card rounded-[14px] px-4 py-3.5 border border-black/5 dark:border-white/8 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold text-foreground truncate">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                    {getCustomerName(invoice.customerId)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-[15px] font-extrabold",
                    invoice.status === "paid" ? "text-greenStatus dark:text-[#4ec472]" :
                    invoice.status === "overdue" ? "text-primary" : "text-foreground"
                  )}>
                    ${Number(invoice.totalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 gap-2">
                <span className={cn(
                  "text-[10px] font-extrabold uppercase tracking-[1.2px] px-2 py-0.5 rounded-[6px]",
                  statusBadge(invoice.status)
                )}>
                  {invoice.status || "draft"}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {invoice.dueDate && invoice.status !== "paid" && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(invoice.dueDate), "d MMM")}
                    </span>
                  )}
                  {invoice.status === "paid" && invoice.paidDate && (
                    <span className="flex items-center gap-1 text-greenStatus dark:text-[#4ec472]">
                      <CheckCircle className="w-3 h-3" />
                      Paid {format(new Date(invoice.paidDate), "d MMM")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <NewInvoiceSheet open={showNew} onOpenChange={setShowNew} />
    </div>
  );
}
