import { useJobs, useUpdateJob } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useInvoices } from "@/hooks/use-invoices";
import { useFollowUpsDue } from "@/hooks/use-follow-ups";
import { useCustomers } from "@/hooks/use-customers";
import { useWidgetConfig } from "@/hooks/use-widget-config";
import { useAuth } from "@/hooks/use-auth";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { JobCompletionModal } from "@/components/JobCompletionModal";
import { QuickQuoteSheet } from "@/components/QuickQuoteSheet";
import { WidgetCustomiseSheet } from "@/components/WidgetCustomiseSheet";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid, CheckCircle2, Play, Sparkles, ChevronRight,
  MapPin, Clock, FileText, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, isToday, isTomorrow,
  startOfDay, startOfWeek, endOfWeek,
} from "date-fns";

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:    "bg-[rgba(20,19,16,0.06)] text-[rgba(20,19,16,0.55)] border-[rgba(20,19,16,0.10)]",
    sent:     "bg-blueSoft text-blueStatus border-[#c8dcff]",
    viewed:   "bg-[#f0eaff] text-[#7c3aed] border-[#d8c8ff]",
    accepted: "bg-greenSoft text-greenStatus border-[#bde2c9]",
    paid:     "bg-greenSoft text-greenStatus border-[#bde2c9]",
    overdue:  "bg-redSoft text-red-600 border-[#f5c6c6]",
    active:   "bg-orangeSoft text-primary border-[#fcc9a8]",
    scheduled:"bg-blueSoft text-blueStatus border-[#c8dcff]",
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

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-extrabold uppercase tracking-[2px] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();
  const { data: followUpsDue } = useFollowUpsDue();
  const { data: customers } = useCustomers();
  const { mutate: updateJob } = useUpdateJob();
  const { config, toggle, isOn } = useWidgetConfig();

  const [completionJob, setCompletionJob] = useState<any>(null);
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const [showCustomise, setShowCustomise] = useState(false);

  const now = new Date();
  const firstName = user?.firstName || "mate";

  // Today's jobs sorted by scheduled time
  const todayJobs = useMemo(() =>
    (jobs || [])
      .filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)))
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()),
    [jobs]
  );

  // Active in-progress job takes priority as hero; else next upcoming
  const heroJob = useMemo(() => {
    const active = todayJobs.find(j => j.status === "in_progress");
    if (active) return active;
    return (jobs || [])
      .filter(j =>
        j.scheduledDate &&
        (j.status === "scheduled" || j.status === "pending") &&
        startOfDay(new Date(j.scheduledDate)) >= startOfDay(now)
      )
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0] || null;
  }, [jobs, todayJobs]);

  // Other today's jobs (not hero)
  const remainingJobs = useMemo(() =>
    todayJobs.filter(j =>
      j.id !== heroJob?.id &&
      j.status !== "completed" &&
      j.status !== "cancelled"
    ),
    [todayJobs, heroJob]
  );

  // --- Stats ---
  const outstandingQuotesValue = useMemo(() =>
    (quotes || [])
      .filter(q => q.status === "sent" || q.status === "viewed")
      .reduce((s, q) => s + parseFloat(q.totalAmount || "0"), 0),
    [quotes]
  );

  const jobsThisWeek = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return (jobs || []).filter(j => {
      if (!j.scheduledDate) return false;
      const d = new Date(j.scheduledDate);
      return d >= start && d <= end;
    }).length;
  }, [jobs]);

  const unpaidValue = useMemo(() =>
    (invoices || [])
      .filter(i => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0),
    [invoices]
  );

  const overdueInvoices = useMemo(() =>
    (invoices || []).filter(i => i.status === "overdue"),
    [invoices]
  );
  const overdueCount = overdueInvoices.length;
  const overdueTotal = useMemo(() =>
    overdueInvoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0),
    [overdueInvoices]
  );

  const recentQuotes = useMemo(() =>
    (quotes || [])
      .filter(q => q.status !== "rejected")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3),
    [quotes]
  );

  const heroLabel = heroJob?.scheduledDate
    ? isToday(new Date(heroJob.scheduledDate)) ? "Today"
      : isTomorrow(new Date(heroJob.scheduledDate)) ? "Tomorrow"
      : format(new Date(heroJob.scheduledDate), "eee d MMM")
    : "";

  const fmt$ = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

  const customerName = (q: any) => {
    if (q.customerId) return customers?.find((c: any) => c.id === q.customerId)?.name;
    try { return JSON.parse(q.content || "{}").customerName; } catch { return undefined; }
  };

  const jobCustomerName = (job: any) => {
    if (job.customerId) return customers?.find((c: any) => c.id === job.customerId)?.name;
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      <ActiveTimerBanner />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 pt-14 pb-4">
        <div>
          <Eyebrow className="mb-1">
            {format(now, "eee d MMM").toUpperCase()}
          </Eyebrow>
          <h1 className="text-[28px] font-extrabold text-foreground leading-tight tracking-[-0.5px]">
            G'day {firstName}
          </h1>
        </div>
        <button
          onClick={() => setShowCustomise(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors mt-2"
          data-testid="button-customise-home"
        >
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-5 space-y-3 max-w-2xl mx-auto">

        {/* ── Up-next hero card ───────────────────────────────────── */}
        {heroJob ? (
          <div className="header-card">
            {/* pulse dot + eyebrow */}
            <div className="relative z-10 flex items-center gap-2 mb-2">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                heroJob.status === "in_progress"
                  ? "bg-[#f26a2a] animate-pulse"
                  : "bg-white/30"
              )} />
              <Eyebrow className="text-white/50">
                {heroJob.status === "in_progress"
                  ? "▶ In Progress"
                  : `Up Next · ${heroLabel}${heroJob.scheduledDate ? " · " + format(new Date(heroJob.scheduledDate), "h:mm a") : ""}`}
              </Eyebrow>
            </div>

            <div className="relative z-10">
              <h2 className="text-[22px] font-extrabold text-white leading-tight tracking-[-0.4px] mb-1">
                {heroJob.title}
              </h2>
              {jobCustomerName(heroJob) && (
                <p className="text-sm text-white/60 mb-0.5">{jobCustomerName(heroJob)}</p>
              )}
              {heroJob.address && (
                <div className="flex items-center gap-1.5 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <p className="text-sm text-white/50 truncate">{heroJob.address}</p>
                </div>
              )}
              {!heroJob.address && <div className="mb-4" />}

              {heroJob.status === "in_progress" ? (
                <button
                  onClick={() => setCompletionJob(heroJob)}
                  className="btn-orange w-full h-12 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-transform"
                >
                  <CheckCircle2 className="w-5 h-5" /> Mark Complete
                </button>
              ) : (
                <button
                  onClick={() => updateJob({ id: heroJob.id, status: "in_progress" })}
                  className="btn-orange w-full h-12 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-transform"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Job
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="header-card">
            <div className="relative z-10">
              <Eyebrow className="text-white/40 mb-2">Today</Eyebrow>
              <h2 className="text-[22px] font-extrabold text-white mb-1">No jobs scheduled</h2>
              <p className="text-white/50 text-sm mb-4">Your day is open — send a quote?</p>
              <button
                onClick={() => setShowQuickQuote(true)}
                className="btn-orange h-12 px-6 flex items-center gap-2 text-sm active:scale-[0.98] transition-transform"
              >
                <Sparkles className="w-4 h-4" /> Quick Quote
              </button>
            </div>
          </div>
        )}

        {/* ── Stat strip ─────────────────────────────────────────── */}
        {isOn("stats") && (
          <div className="grid grid-cols-3 gap-2">
            <Link href="/jobs">
              <div className="bg-card rounded-[14px] px-3 py-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                <Eyebrow className="mb-2">Today</Eyebrow>
                <p className="text-[22px] font-extrabold text-foreground leading-none">
                  {todayJobs.length}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">jobs</p>
              </div>
            </Link>
            <Link href="/jobs">
              <div className="bg-card rounded-[14px] px-3 py-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                <Eyebrow className="mb-2">This Week</Eyebrow>
                <p className="text-[22px] font-extrabold text-primary leading-none">
                  {jobsThisWeek}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">jobs</p>
              </div>
            </Link>
            <Link href="/invoices">
              <div className={cn(
                "rounded-[14px] px-3 py-3.5 border active:scale-[0.98] transition-transform cursor-pointer",
                overdueCount > 0
                  ? "bg-redSoft border-red-200 dark:border-red-900/40"
                  : "bg-card border-black/5 dark:border-white/5"
              )}>
                <Eyebrow className="mb-2">Overdue</Eyebrow>
                <p className={cn(
                  "text-[22px] font-extrabold leading-none",
                  overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                )}>
                  {overdueCount}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">invoices</p>
              </div>
            </Link>
          </div>
        )}

        {/* ── AI CTA band ─────────────────────────────────────────── */}
        {isOn("quick-quote") && (
          <button
            onClick={() => setShowQuickQuote(true)}
            className="w-full h-14 rounded-[999px] flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, #f26a2a 0%, #d94d0e 100%)",
              boxShadow: "0 10px 24px rgba(242,106,42,0.4)",
            }}
            data-testid="widget-quick-quote"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-sm font-extrabold text-white">Draft a quote with one sentence</span>
            </div>
            <span className="text-white/70 text-lg">→</span>
          </button>
        )}

        {/* ── Quick actions ────────────────────────────────────────── */}
        {isOn("quick-actions") && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLocation("/quotes/new")}
              className="h-12 rounded-[14px] bg-card border border-black/5 dark:border-white/5 text-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
            >
              <FileText className="w-4 h-4 text-primary" /> New Quote
            </button>
            <Link href="/jobs">
              <button className="w-full h-12 rounded-[14px] bg-card border border-black/5 dark:border-white/5 text-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm">
                <TrendingUp className="w-4 h-4 text-primary" /> Schedule Job
              </button>
            </Link>
          </div>
        )}

        {/* ── Follow-up alerts ─────────────────────────────────────── */}
        {isOn("follow-ups") && followUpsDue && followUpsDue.length > 0 && (
          <Link href="/quotes">
            <div className="flex items-center gap-3 bg-orangeSoft dark:bg-[rgba(242,106,42,0.12)] border border-[#fcc9a8] dark:border-[rgba(242,106,42,0.2)] rounded-[14px] px-4 py-3 active:scale-[0.98] transition-transform">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-primary flex-1">
                {followUpsDue.length} quote follow-up{followUpsDue.length !== 1 ? "s" : ""} due
              </p>
              <ChevronRight className="w-4 h-4 text-primary/50 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Overdue invoice alert ─────────────────────────────────── */}
        {overdueCount > 0 && (
          <Link href="/invoices">
            <div className="flex items-center gap-3 bg-redSoft dark:bg-[rgba(255,106,106,0.1)] border border-red-200 dark:border-red-900/40 rounded-[14px] px-4 py-3 active:scale-[0.98] transition-transform">
              <FileText className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  ${overdueTotal.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Today's schedule timeline ────────────────────────────── */}
        {isOn("today-schedule") && todayJobs.length > 0 && (
          <div>
            <Eyebrow className="px-1 pt-1 pb-2">Your rounds today</Eyebrow>
            <div className="space-y-0">
              {todayJobs.map((job, i) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="flex gap-3 active:scale-[0.99] transition-transform">
                    {/* Time gutter */}
                    <div className="flex flex-col items-center w-12 shrink-0 pt-3.5">
                      {job.scheduledDate ? (
                        <>
                          <p className="text-[11px] font-bold text-foreground leading-none">
                            {format(new Date(job.scheduledDate), "h:mm")}
                          </p>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground leading-none mt-0.5">
                            {format(new Date(job.scheduledDate), "a")}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] font-bold text-muted-foreground">TBD</p>
                      )}
                      {i < todayJobs.length - 1 && (
                        <div className="w-px flex-1 mt-2 bg-border min-h-[24px]" />
                      )}
                    </div>

                    {/* Job card */}
                    <div className={cn(
                      "flex-1 rounded-[14px] px-3.5 py-3 border mb-2",
                      job.status === "in_progress"
                        ? "bg-vgnBlack dark:bg-vgnBlack border-transparent text-white"
                        : job.id === heroJob?.id
                        ? "bg-vgnBlack dark:bg-vgnBlack border-transparent text-white"
                        : "bg-card border-black/5 dark:border-white/5"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-[13px] font-bold truncate",
                            (job.status === "in_progress" || job.id === heroJob?.id) ? "text-white" : "text-foreground"
                          )}>
                            {job.title}
                          </p>
                          {jobCustomerName(job) && (
                            <p className={cn(
                              "text-[11px] font-semibold mt-0.5 truncate",
                              (job.status === "in_progress" || job.id === heroJob?.id) ? "text-white/60" : "text-muted-foreground"
                            )}>
                              {jobCustomerName(job)}
                            </p>
                          )}
                        </div>
                        <StatusPill status={
                          job.status === "in_progress" ? "active" :
                          job.status === "completed" ? "paid" :
                          job.status || "scheduled"
                        } />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Money in motion ──────────────────────────────────────── */}
        {isOn("recent-quotes") && (
          <div>
            <div className="flex items-center justify-between px-1 pt-1 pb-2">
              <Eyebrow>$ getting paid</Eyebrow>
              <Link href="/invoices">
                <span className="text-[10px] font-extrabold text-primary">See all →</span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/quotes">
                <div className="bg-card rounded-[14px] px-3 py-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                  <Eyebrow className="mb-2 text-[9px]">Pipeline</Eyebrow>
                  <p className="text-[16px] font-extrabold text-primary leading-none">
                    {fmt$(outstandingQuotesValue)}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">in quotes</p>
                </div>
              </Link>
              <Link href="/invoices">
                <div className="bg-card rounded-[14px] px-3 py-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                  <Eyebrow className="mb-2 text-[9px]">Awaiting</Eyebrow>
                  <p className="text-[16px] font-extrabold text-foreground leading-none">
                    {fmt$(unpaidValue)}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">invoiced</p>
                </div>
              </Link>
              <Link href="/invoices">
                <div className={cn(
                  "rounded-[14px] px-3 py-3.5 border active:scale-[0.98] transition-transform cursor-pointer",
                  overdueCount > 0
                    ? "bg-redSoft border-red-200 dark:border-red-900/40"
                    : "bg-card border-black/5 dark:border-white/5"
                )}>
                  <Eyebrow className="mb-2 text-[9px]">Overdue</Eyebrow>
                  <p className={cn(
                    "text-[16px] font-extrabold leading-none",
                    overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                  )}>
                    {fmt$(overdueTotal)}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">past due</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── Recent quotes list ───────────────────────────────────── */}
        {isOn("recent-quotes") && recentQuotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 pt-1 pb-2">
              <Eyebrow>Recent quotes</Eyebrow>
              <Link href="/quotes">
                <span className="text-[10px] font-extrabold text-primary">See all →</span>
              </Link>
            </div>
            <div className="space-y-2">
              {recentQuotes.map(q => (
                <Link key={q.id} href={`/quotes/${q.id}`}>
                  <div className="bg-card rounded-[14px] px-4 py-3.5 border border-black/5 dark:border-white/5 flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate text-foreground">
                        {customerName(q) || `Quote #${q.id}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {q.createdAt ? format(new Date(q.createdAt), "d MMM yyyy") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <p className="text-[13px] font-extrabold text-foreground">
                        ${Number(q.totalAmount).toLocaleString("en-AU")}
                      </p>
                      <StatusPill status={q.status || "draft"} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {completionJob && (
        <JobCompletionModal
          open={!!completionJob}
          onOpenChange={(v) => { if (!v) setCompletionJob(null); }}
          jobId={completionJob.id}
          jobTitle={completionJob.title}
          customerId={completionJob.customerId}
        />
      )}

      <QuickQuoteSheet open={showQuickQuote} onOpenChange={setShowQuickQuote} />

      <WidgetCustomiseSheet
        open={showCustomise}
        onOpenChange={setShowCustomise}
        config={config}
        toggle={toggle}
      />
    </div>
  );
}
