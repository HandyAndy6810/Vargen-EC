import { useQuotes, useDeleteQuote } from "@/hooks/use-quotes";
import { useJobs } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, FileText, MessageSquare, Mail, Flame, Trash2, Search } from "lucide-react";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useNavAction } from "@/hooks/use-nav-action";
import { QuickQuoteSheet } from "@/components/QuickQuoteSheet";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import FollowUpSheet from "@/components/FollowUpSheet";

type FilterTab = "all" | "draft" | "sent" | "accepted" | "overdue";

function parseQuoteContent(content: string | null) {
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:    "bg-[rgba(20,19,16,0.06)] text-[rgba(20,19,16,0.55)] border-[rgba(20,19,16,0.10)] dark:bg-white/8 dark:text-white/50 dark:border-white/10",
    sent:     "bg-blueSoft text-blueStatus border-[#c8dcff] dark:bg-[rgba(90,156,255,0.15)] dark:text-[#5a9cff] dark:border-[rgba(90,156,255,0.3)]",
    viewed:   "bg-[#f0eaff] text-[#7c3aed] border-[#d8c8ff] dark:bg-[rgba(124,58,237,0.15)] dark:text-[#a78bfa] dark:border-[rgba(124,58,237,0.3)]",
    accepted: "bg-greenSoft text-greenStatus border-[#bde2c9] dark:bg-[rgba(78,196,114,0.15)] dark:text-[#4ec472] dark:border-[rgba(78,196,114,0.3)]",
    rejected: "bg-redSoft text-red-600 border-[#f5c6c6] dark:bg-[rgba(255,106,106,0.15)] dark:text-[#ff6a6a] dark:border-[rgba(255,106,106,0.3)]",
    overdue:  "bg-orangeSoft text-primary border-[#fcc9a8] dark:bg-[rgba(242,106,42,0.18)] dark:border-[rgba(242,106,42,0.3)]",
  };
  return (
    <span className={cn(
      "text-[10px] font-extrabold uppercase tracking-[1.2px] px-2 py-0.5 rounded-[6px] border",
      styles[status] || styles.draft
    )}>
      {status}
    </span>
  );
}

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterTab>("all");
  const { toast } = useToast();
  const [followUpQuote, setFollowUpQuote] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const { mutate: deleteQuote } = useDeleteQuote();

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

  useNavAction({ label: "Quote", icon: Plus, onClick: () => setShowQuickQuote(true), color: "bg-primary" }, []);

  const getCustomer = (quote: { id: number; jobId: number | null }) => {
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job?.customerId) return customers?.find(c => c.id === job.customerId);
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

  const getJobTitle = (quote: { content: string | null; jobId: number | null }) => {
    const parsed = parseQuoteContent(quote.content);
    if (parsed?.jobTitle) return parsed.jobTitle;
    if (quote.jobId) {
      const job = jobs?.find(j => j.id === quote.jobId);
      if (job) return job.title;
    }
    return "No job linked";
  };

  const isOverdue = (quote: any) => {
    const sentDate = quote.sentAt || quote.createdAt;
    return ["sent", "viewed"].includes(quote.status || "") && sentDate &&
      differenceInDays(new Date(), new Date(sentDate)) >= 14;
  };

  const isCold = (quote: any) => {
    const sentDate = quote.sentAt || quote.createdAt;
    return quote.status === "sent" && sentDate && differenceInDays(new Date(), new Date(sentDate)) >= 3;
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    const q = quotes || [];
    return {
      all: q.length,
      draft: q.filter(x => x.status === "draft").length,
      sent: q.filter(x => ["sent","viewed"].includes(x.status || "")).length,
      accepted: q.filter(x => x.status === "accepted").length,
      overdue: q.filter(x => isOverdue(x)).length,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return (quotes || [])
      .filter(q => {
        const status = q.status || "draft";
        if (filter === "all") return true;
        if (filter === "overdue") return isOverdue(q);
        if (filter === "sent") return status === "sent" || status === "viewed";
        return status === filter;
      })
      .filter(q => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return getCustomerName(q).toLowerCase().includes(s) || getJobTitle(q).toLowerCase().includes(s);
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [quotes, filter, search, jobs, customers]);

  // Summary stats
  const totalPipeline = useMemo(() =>
    (quotes || [])
      .filter(q => ["draft","sent","viewed","accepted"].includes(q.status || ""))
      .reduce((s, q) => s + Number(q.totalAmount || 0), 0),
    [quotes]
  );

  const overdueValue = useMemo(() =>
    (quotes || []).filter(q => isOverdue(q)).reduce((s, q) => s + Number(q.totalAmount || 0), 0),
    [quotes]
  );

  const sentValue = useMemo(() =>
    (quotes || []).filter(q => q.status === "sent" || q.status === "viewed").reduce((s, q) => s + Number(q.totalAmount || 0), 0),
    [quotes]
  );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "draft",    label: "Draft" },
    { key: "sent",     label: "Sent" },
    { key: "accepted", label: "Accepted" },
    { key: "overdue",  label: "Overdue" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-5 pt-14 pb-0">
        <div className="flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-muted-foreground">Quotes</p>
          <p className="text-[22px] font-extrabold text-foreground tracking-[-0.5px] mt-0.5">All quotes</p>
        </div>
        <button
          onClick={() => setLocation("/quotes/new")}
          className="w-10 h-10 rounded-[12px] flex items-center justify-center active:scale-90 transition-all mt-1"
          style={{ background: "#f26a2a", boxShadow: "0 6px 14px rgba(242,106,42,0.4)" }}
          data-testid="button-new-quote"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Summary hero ─────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-0">
        <div className="rounded-[22px] p-[18px] text-white relative overflow-hidden"
          style={{ background: "#0f0e0b" }}>
          <div className="absolute top-0 right-0 w-[140px] h-[140px] pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, rgba(242,106,42,0.35), transparent 70%)" }} />
          <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-white/60 mb-1">Outstanding pipeline</p>
          <div className="flex items-baseline gap-2 mb-3.5">
            <span className="font-extrabold text-white leading-none" style={{ fontSize: 38, letterSpacing: -1.2 }}
              data-testid="text-pipeline-value">
              ${totalPipeline.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[12px] text-white/50 font-bold">
              / {(quotes || []).length} quotes
            </span>
          </div>
          <div className="flex gap-4 text-[11px] font-bold">
            <span><span className="text-primary">●</span> ${overdueValue.toLocaleString("en-AU", { maximumFractionDigits: 0 })} overdue</span>
            <span className="text-white/55">● ${sentValue.toLocaleString("en-AU", { maximumFractionDigits: 0 })} awaiting</span>
          </div>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="px-5 pt-3.5">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] bg-card border border-black/8 dark:border-white/8">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search quotes, customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-[13px] text-foreground bg-transparent placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-5 pt-3.5 pb-1 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const active = filter === t.key;
          const count = tabCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-extrabold whitespace-nowrap shrink-0 border transition-all",
                active
                  ? "bg-ink text-white border-ink dark:bg-foreground dark:text-background"
                  : "bg-card text-muted-foreground border-black/8 dark:border-white/8"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[10px] px-1.5 py-[1px] rounded-full font-extrabold",
                active ? "bg-primary text-white" : "bg-paperDeep dark:bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Quote list ───────────────────────────────────────────── */}
      <div className="px-5 pt-1.5 flex flex-col gap-2.5">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-card rounded-[22px] p-12 text-center border border-black/5 dark:border-white/8 mt-2">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="font-bold text-foreground">
              {filter === "all" ? "No quotes yet" : `No ${filter} quotes`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "all" && "Tap + to create your first quote."}
            </p>
            {filter === "all" && (
              <Link href="/quotes/new">
                <Button className="mt-4 rounded-xl font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Create Quote
                </Button>
              </Link>
            )}
          </div>
        ) : (
          filteredQuotes.map(quote => {
            const status = quote.status || "draft";
            const cold = isCold(quote);
            const quoteNum = `${quote.id}`.padStart(3, "0");
            const customerName = getCustomerName(quote);
            const jobTitle = getJobTitle(quote);
            const age = quote.createdAt
              ? (() => {
                  const d = differenceInDays(new Date(), new Date(quote.createdAt));
                  return d === 0 ? "Just now" : d === 1 ? "1d ago" : `${d}d ago`;
                })()
              : "";

            return (
              <SwipeableRow
                key={quote.id}
                className="rounded-[18px]"
                actions={[{
                  label: "Delete",
                  icon: <Trash2 className="w-4 h-4 text-white" />,
                  bgClass: "bg-red-400/90",
                  onClick: () => setConfirmDeleteId(quote.id),
                }]}
              >
                <button
                  onClick={() => setLocation(`/quotes/${quote.id}`)}
                  className="w-full text-left flex items-center gap-3.5 px-4 py-4 rounded-[18px] bg-card border border-black/5 dark:border-white/8 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}
                  data-testid={`card-quote-${quote.id}`}
                >
                  {/* Quote number avatar */}
                  <div className="w-11 h-11 rounded-[14px] bg-paperDeep dark:bg-muted flex items-center justify-center text-[10px] font-extrabold text-ink/70 dark:text-white/50 shrink-0"
                    style={{ letterSpacing: 0.5 }}>
                    {quoteNum}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-extrabold text-foreground truncate flex-1" style={{ letterSpacing: -0.2 }}
                        data-testid={`text-quote-customer-${quote.id}`}>
                        {jobTitle !== "No job linked" ? jobTitle : customerName}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate" data-testid={`text-quote-job-${quote.id}`}>
                      {customerName !== `Quote #${quote.id}` ? customerName : "No customer"} · {age}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusPill status={status} />
                      {cold && (
                        <button
                          onClick={e => { e.stopPropagation(); setFollowUpQuote(quote); }}
                          className="text-[9.5px] font-extrabold text-orangeDeep bg-orangeSoft px-1.5 py-0.5 rounded border border-[#f8c59f] flex items-center gap-0.5"
                          data-testid={`button-followup-${quote.id}`}
                        >
                          <Flame className="w-2.5 h-2.5" /> Follow up
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Amount + arrow */}
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-extrabold text-foreground" style={{ letterSpacing: -0.3 }}
                      data-testid={`text-quote-amount-${quote.id}`}>
                      ${Number(quote.totalAmount).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                    </p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-1 ml-auto opacity-40"
                      style={{ transform: "rotate(-45deg)" }}>
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              </SwipeableRow>
            );
          })
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="rounded-[2rem] max-w-sm">
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
          daysSinceSent={(() => { const d = (followUpQuote as any).sentAt || followUpQuote.createdAt; return d ? differenceInDays(new Date(), new Date(d)) : 0; })()}
        />
      )}

      <QuickQuoteSheet open={showQuickQuote} onOpenChange={setShowQuickQuote} />
    </div>
  );
}
