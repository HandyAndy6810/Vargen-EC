import { useQuotes, useDeleteQuote } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, FileText, Bell, MessageSquare, Mail, Clock, Send, CheckCircle2, XCircle, Eye, PenLine, Flame, TrendingUp, DollarSign, Percent, Trash2, Search, ChevronRight } from "lucide-react";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useNavAction } from "@/hooks/use-nav-action";
import { QuickQuoteSheet } from "@/components/QuickQuoteSheet";
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FollowUpSheet from "@/components/FollowUpSheet";

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

  const { toast } = useToast();
  const [followUpQuote, setFollowUpQuote] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const { mutate: deleteQuote } = useDeleteQuote();

  useNavAction({ label: "Quote", icon: Plus, onClick: () => setShowQuickQuote(true), color: "bg-primary" }, []);

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      const res = await fetch("/api/messages/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to send email");
    },
    onSuccess: () => toast({ title: "Email sent!" }),
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });

  const activeStatuses = ["draft", "sent", "viewed"];
  const historyStatuses = ["accepted", "rejected"];

  const filteredQuotes = quotes
    ?.filter(q => tab === "active" ? activeStatuses.includes(q.status || "") : historyStatuses.includes(q.status || ""))
    .filter(q => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        getCustomerName(q).toLowerCase().includes(s) ||
        getJobTitle(q).toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    || [];

  const totalPipeline = quotes
    ?.filter(q => activeStatuses.includes(q.status || ""))
    .reduce((sum, q) => sum + Number(q.totalAmount || 0), 0) || 0;

  const stats = (() => {
    if (!quotes) return { winRate: 0, avgValue: 0 };
    const sent = quotes.filter(q => (q.status || "") === "sent").length;
    const accepted = quotes.filter(q => (q.status || "") === "accepted").length;
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

  const getQuoteWarnings = (quote: { id: number; content: string | null; jobId: number | null; status: string | null }) => {
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

  const statusColor = (status: string, isCold?: boolean) => {
    if (isCold) return "text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-900/20";
    switch (status) {
      case "draft": return "text-yellow-600 dark:text-yellow-400 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "sent": return "text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "viewed": return "text-purple-600 dark:text-purple-400 border-purple-500 bg-purple-50 dark:bg-purple-900/20";
      case "accepted": return "text-green-600 dark:text-green-400 border-green-500 bg-green-50 dark:bg-green-900/20";
      case "rejected": return "text-red-500 dark:text-red-400 border-red-500 bg-red-50 dark:bg-red-900/20";
      default: return "text-muted-foreground border-muted bg-muted/20";
    }
  };

  const getStatusBorder = (status: string, isCold?: boolean) => {
    if (isCold) return "bg-amber-500";
    switch (status) {
      case "draft": return "bg-yellow-500";
      case "sent": return "bg-blue-500";
      case "viewed": return "bg-purple-500";
      case "accepted": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const getStatusDot = (status: string, isCold?: boolean) => {
    if (isCold) return "bg-amber-500";
    switch (status) {
      case "draft":    return "bg-yellow-400";
      case "sent":     return "bg-blue-500";
      case "viewed":   return "bg-purple-500";
      case "accepted": return "bg-green-500";
      case "rejected": return "bg-red-400";
      default:         return "bg-muted-foreground/40";
    }
  };

  const expiringQuotes = quotes?.filter(q => {
    if (q.status !== "sent" || !q.createdAt) return false;
    const daysSinceSent = differenceInDays(new Date(), new Date(q.createdAt));
    // Quotes expire after 30 days based on T&Cs, surfacing those 23-27 days old (3-7 days left)
    return daysSinceSent >= 23 && daysSinceSent <= 27;
  }) || [];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header & Dashboard Strip */}
      <div className="px-6 pt-12 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-quotes-title">Quotes</h1>
          <button
            onClick={() => setLocation("/quotes/new")}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md active:scale-90 transition-transform duration-150"
          >
            <Plus className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pipeline</p>
            </div>
            <p className="text-sm font-bold text-primary truncate" data-testid="text-pipeline-value">
              ${totalPipeline.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Percent className="w-3 h-3 text-emerald-500" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Win Rate</p>
            </div>
            <p className="text-sm font-bold text-foreground truncate" data-testid="text-win-rate">
              {stats.winRate.toFixed(0)}%
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-blue-500" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Avg Value</p>
            </div>
            <p className="text-sm font-bold text-foreground truncate" data-testid="text-avg-value">
              ${stats.avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Expiring Soon / Follow up Nudge */}
        {expiringQuotes.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 px-1">
              <Bell className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-foreground">Follow up required ({expiringQuotes.length})</h2>
            </div>
            {expiringQuotes.map(quote => {
              const customer = getCustomer(quote);
              const name = getCustomerName(quote);
              const daysLeft = 30 - differenceInDays(new Date(), new Date(quote.createdAt!));
              
              return (
                <div key={`nudge-${quote.id}`} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{name}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Expires in {daysLeft} days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="rounded-full w-9 h-9 border-orange-200 bg-white hover:bg-orange-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customer?.phone) {
                          window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(`Hi ${customer.name}, just following up on the quote I sent for ${getJobTitle(quote)}. Did you have any questions?`)}`;
                        }
                      }}
                    >
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full w-9 h-9 border-orange-200 bg-white hover:bg-orange-50"
                      disabled={!customer?.email || sendEmailMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customer?.email) {
                          sendEmailMutation.mutate({
                            to: customer.email,
                            subject: `Follow up: ${getJobTitle(quote)}`,
                            body: `Hi ${customer.name},\n\nJust checking in to see if you've had a chance to review the quote I sent over.\n\nLet me know if you'd like to proceed or have any questions.\n\nCheers!`,
                          });
                        }
                      }}
                    >
                      <Mail className="w-4 h-4 text-orange-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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
      <div className="px-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center gap-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-3.5 w-12 rounded shrink-0" />
            </div>
          ))
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-10 text-center shadow-sm border border-black/5 dark:border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-primary/20 dark:to-amber-900/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">
              {tab === "active" ? "No active quotes" : "No quote history"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {tab === "active" ? "Create your first quote and start winning jobs" : "Accepted and rejected quotes will appear here"}
            </p>
            {tab === "active" && (
              <Link href="/quotes/new">
                <Button className="rounded-xl font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Create Quote
                </Button>
              </Link>
            )}
          </div>
        ) : (
          filteredQuotes.map(quote => {
            const status = quote.status || "draft";
            const isCold = !!(status === "sent" && quote.createdAt && differenceInDays(new Date(), new Date(quote.createdAt)) >= 7);
            const warnings = getQuoteWarnings(quote);
            const hasWarning = warnings.length > 0;

            return (
              <SwipeableRow
                key={quote.id}
                className="rounded-xl"
                actions={[{
                  label: "Delete",
                  icon: <Trash2 className="w-4 h-4 text-white" />,
                  bgClass: "bg-red-400/90",
                  onClick: () => setConfirmDeleteId(quote.id),
                }]}
              >
                <div
                  onClick={() => setLocation(`/quotes/${quote.id}`)}
                  className="bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-transform flex items-center gap-3 px-4 py-3.5"
                  data-testid={`card-quote-${quote.id}`}
                >
                  {/* Status dot — warning overlay if needed */}
                  <div className="relative shrink-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full", getStatusDot(status, isCold))} />
                    {hasWarning && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white dark:border-card" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate leading-snug" data-testid={`text-quote-customer-${quote.id}`}>
                      {getCustomerName(quote)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1" data-testid={`text-quote-job-${quote.id}`}>
                        {getJobTitle(quote)}
                      </p>
                      {isCold && (
                        <button
                          onClick={e => { e.stopPropagation(); setFollowUpQuote(quote); }}
                          className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-0.5"
                          data-testid={`button-followup-${quote.id}`}
                        >
                          <Flame className="w-2.5 h-2.5" /> Follow up
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Amount + date */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground" data-testid={`text-quote-amount-${quote.id}`}>
                      ${Number(quote.totalAmount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {quote.createdAt ? format(new Date(quote.createdAt), "d MMM") : ""}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 ml-0.5" />
                </div>
              </SwipeableRow>
            );
          })
        )}
      </div>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="rounded-[2rem] mx-4 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (confirmDeleteId !== null) {
                  deleteQuote(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {followUpQuote && (
        <FollowUpSheet
          open={!!followUpQuote}
          onClose={() => setFollowUpQuote(null)}
          clientName={getCustomerName(followUpQuote)}
          clientPhone={getCustomer(followUpQuote)?.phone || null}
          jobDescription={getJobTitle(followUpQuote)}
          amount={Number(followUpQuote.totalAmount).toLocaleString()}
          daysSinceSent={followUpQuote.createdAt ? differenceInDays(new Date(), new Date(followUpQuote.createdAt)) : 0}
        />
      )}

      <QuickQuoteSheet open={showQuickQuote} onOpenChange={setShowQuickQuote} />
    </div>
  );
}
