import { useQuotes } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState } from "react";
import { Plus, Loader2, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function parseQuoteContent(content: string | null) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"active" | "history">("active");

  const activeStatuses = ["draft", "sent"];
  const historyStatuses = ["accepted", "rejected"];

  const filteredQuotes = quotes
    ?.filter(q => tab === "active" ? activeStatuses.includes(q.status) : historyStatuses.includes(q.status))
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    || [];

  const totalPipeline = quotes
    ?.filter(q => activeStatuses.includes(q.status))
    .reduce((sum, q) => sum + Number(q.totalAmount || 0), 0) || 0;

  const stats = (() => {
    if (!quotes) return { winRate: 0, avgValue: 0 };
    const sent = quotes.filter(q => q.status === "sent").length;
    const accepted = quotes.filter(q => q.status === "accepted").length;
    const winRate = sent > 0 ? (accepted / (sent + accepted)) * 100 : 0;
    const avgValue = quotes.length > 0 
      ? quotes.reduce((sum, q) => sum + Number(q.totalAmount || 0), 0) / quotes.length 
      : 0;
    return { winRate, avgValue };
  })();

  const getCustomer = (quote: { id: number; jobId: number | null }) => {
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) {
        return customers?.find(c => c.id === job.customerId);
      }
    }
    return null;
  };

  const getCustomerName = (quote: { id: number; content: string | null; jobId: number | null }) => {
    const parsed = parseQuoteContent(quote.content);
    if (parsed?.notes) {
      const match = (parsed.notes as string).match(/Quote for:\s*(.+?)[\.\n]/);
      if (match) return match[1].trim();
    }
    const customer = getCustomer(quote);
    if (customer) return customer.name;
    return `Quote #${quote.id}`;
  };

  const getQuoteWarnings = (quote: { id: number; content: string | null; jobId: number | null; status: string }) => {
    const warnings: string[] = [];
    const parsed = parseQuoteContent(quote.content);
    const customer = getCustomer(quote);

    if (quote.status === "draft") {
      if (!customer) {
        warnings.push("No client linked");
      } else if (!customer.email) {
        warnings.push("Missing client email");
      }
      
      if (!parsed?.items || parsed.items.length === 0) {
        warnings.push("No line items");
      }
    }
    
    return warnings;
  };

  const getJobTitle = (quote: { content: string | null; jobId: number | null }) => {
    const parsed = parseQuoteContent(quote.content);
    if (parsed?.jobTitle) return parsed.jobTitle;
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job) return job.title;
    }
    return "No job linked";
  };

  const getCustomerAddress = (quote: { id: number; jobId: number | null }) => {
    const customer = getCustomer(quote);
    return customer?.address;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return "text-yellow-600 dark:text-yellow-400 border-yellow-500";
      case "sent": return "text-blue-600 dark:text-blue-400 border-blue-500";
      case "accepted": return "text-green-600 dark:text-green-400 border-green-500";
      case "rejected": return "text-red-500 dark:text-red-400 border-red-500";
      default: return "text-muted-foreground border-muted";
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-500";
      case "sent": return "bg-blue-500";
      case "accepted": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header & Dashboard Strip */}
      <div className="px-6 pt-12 mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-quotes-title">Quotes</h1>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Pipeline</p>
            <p className="text-sm font-bold text-primary truncate" data-testid="text-pipeline-value">
              ${totalPipeline.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Win Rate</p>
            <p className="text-sm font-bold text-foreground truncate" data-testid="text-win-rate">
              {stats.winRate.toFixed(0)}%
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Avg Value</p>
            <p className="text-sm font-bold text-foreground truncate" data-testid="text-avg-value">
              ${stats.avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="px-6 mb-6">
        <div className="bg-[#F0EEEB] dark:bg-white/10 p-1 rounded-2xl flex gap-1">
          <button
            onClick={() => setTab("active")}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              tab === "active" ? "bg-white dark:bg-white/20 text-foreground shadow-sm" : "text-muted-foreground"
            )}
            data-testid="tab-active"
          >
            Active
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              tab === "history" ? "bg-white dark:bg-white/20 text-foreground shadow-sm" : "text-muted-foreground"
            )}
            data-testid="tab-history"
          >
            History
          </button>
        </div>
      </div>

      {/* Quote List */}
      <div className="px-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-12 text-center shadow-sm border border-black/5 dark:border-white/10">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="font-medium text-muted-foreground">
              {tab === "active" ? "No active quotes" : "No quote history"}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {tab === "active" ? "Create your first quote to get started" : "Accepted and rejected quotes will appear here"}
            </p>
          </div>
        ) : (
          filteredQuotes.map(quote => (
            <div
              key={quote.id}
              onClick={() => setLocation(`/quotes/${quote.id}`)}
              className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all overflow-hidden flex"
              data-testid={`card-quote-${quote.id}`}
            >
              <div className={cn("w-1.5 shrink-0", getStatusBorder(quote.status))} />
              <div className="p-5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-foreground truncate" data-testid={`text-quote-customer-${quote.id}`}>
                      {getCustomerName(quote)}
                    </p>
                    <p className="text-sm font-medium text-foreground/80 truncate mt-0.5" data-testid={`text-quote-job-${quote.id}`}>
                      {getJobTitle(quote)}
                    </p>
                    {getCustomerAddress(quote) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-quote-address-${quote.id}`}>
                        {getCustomerAddress(quote)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-foreground" data-testid={`text-quote-amount-${quote.id}`}>
                      ${Number(quote.totalAmount).toLocaleString()}
                    </p>
                    {quote.createdAt && (
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">
                        {format(new Date(quote.createdAt), "dd MMM")}
                      </p>
                    )}
                  </div>
                </div>
                
                {getQuoteWarnings(quote).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getQuoteWarnings(quote).map((warning, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md"
                        data-testid={`text-quote-warning-${quote.id}-${idx}`}
                      >
                        {warning}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", statusColor(quote.status))} data-testid={`text-quote-status-${quote.id}`}>
                    {quote.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <Link href="/quotes/new">
        <button
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform z-50"
          data-testid="button-create-quote-fab"
        >
          <Plus className="w-7 h-7" />
        </button>
      </Link>
    </div>
  );
}
