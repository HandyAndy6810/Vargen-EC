import { useQuotes } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState } from "react";
import { Plus, Loader2, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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

  const getCustomerName = (quote: { id: number; content: string | null; jobId: number | null }) => {
    const parsed = parseQuoteContent(quote.content);
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
    return `Quote #${quote.id}`;
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

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return "text-yellow-600 dark:text-yellow-400";
      case "sent": return "text-blue-600 dark:text-blue-400";
      case "accepted": return "text-green-600 dark:text-green-400";
      case "rejected": return "text-red-500 dark:text-red-400";
      default: return "text-muted-foreground";
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
              className="bg-white dark:bg-white/5 rounded-2xl p-5 shadow-sm border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all"
              data-testid={`card-quote-${quote.id}`}
            >
              <p className="font-bold text-lg text-foreground truncate" data-testid={`text-quote-customer-${quote.id}`}>
                {getCustomerName(quote)}
              </p>
              <p className="text-sm text-muted-foreground truncate mt-0.5" data-testid={`text-quote-job-${quote.id}`}>
                {getJobTitle(quote)}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-foreground" data-testid={`text-quote-amount-${quote.id}`}>
                  ${Number(quote.totalAmount).toLocaleString()}
                </span>
                <span className={cn("text-sm font-semibold capitalize", statusColor(quote.status))} data-testid={`text-quote-status-${quote.id}`}>
                  {quote.status}
                </span>
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
