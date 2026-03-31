import { useJobs, useUpdateJob } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useInvoices } from "@/hooks/use-invoices";
import { useFollowUpsDue } from "@/hooks/use-follow-ups";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { JobCompletionModal } from "@/components/JobCompletionModal";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Plus, ChevronRight, Settings, Clock,
  FileText, Play, CheckCircle2, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, isToday, isTomorrow,
  startOfDay, startOfWeek, endOfWeek,
} from "date-fns";

export default function Home() {
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();
  const { data: invoices } = useInvoices();
  const { data: followUpsDue } = useFollowUpsDue();
  const { mutate: updateJob } = useUpdateJob();
  const [completionJob, setCompletionJob] = useState<any>(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" : "Good evening";

  // Today's jobs sorted by scheduled time
  const todayJobs = useMemo(() =>
    (jobs || [])
      .filter(j => j.scheduledDate && isToday(new Date(j.scheduledDate)))
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()),
    [jobs]
  );

  // Active in-progress job takes priority as hero; else next scheduled
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

  // Today's remaining jobs (not the hero, not done/cancelled)
  const remainingJobs = useMemo(() =>
    todayJobs.filter(j =>
      j.id !== heroJob?.id &&
      j.status !== "completed" &&
      j.status !== "cancelled"
    ),
    [todayJobs, heroJob]
  );

  // Stats
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

  const overdueCount = useMemo(() =>
    (invoices || []).filter(i => i.status === "overdue").length,
    [invoices]
  );

  const heroLabel = heroJob?.scheduledDate
    ? isToday(new Date(heroJob.scheduledDate)) ? "Today"
      : isTomorrow(new Date(heroJob.scheduledDate)) ? "Tomorrow"
      : format(new Date(heroJob.scheduledDate), "eee d MMM")
    : "";

  const fmt$ = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

  return (
    <div className="min-h-screen bg-background pb-32">
      <ActiveTimerBanner />

      {/* ── Compact header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-12 pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {format(now, "EEEE d MMMM")}
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">{greeting}</h1>
        </div>
        <Link href="/profile">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>
      </div>

      <div className="px-6 space-y-3 max-w-2xl mx-auto">

        {/* ── Hero job card ───────────────────────────────────────── */}
        {heroJob ? (
          <div className={cn(
            "rounded-3xl p-5",
            heroJob.status === "in_progress"
              ? "bg-blue-600 text-white"
              : "header-card"
          )}>
            {/* Label + details link */}
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                  {heroJob.status === "in_progress" ? "▶ In Progress" : `Next Job · ${heroLabel}`}
                </p>
                <h2 className="text-xl font-bold text-white leading-tight truncate">
                  {heroJob.title}
                </h2>
                {heroJob.scheduledDate && (
                  <p className="text-sm text-white/60 mt-0.5">
                    {format(new Date(heroJob.scheduledDate), "h:mm a")}
                  </p>
                )}
              </div>
              <Link href={`/jobs/${heroJob.id}`}>
                <button className="shrink-0 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
                  Details
                </button>
              </Link>
            </div>

            {/* Primary action */}
            {heroJob.status === "in_progress" ? (
              <button
                onClick={() => setCompletionJob(heroJob)}
                className="w-full h-12 rounded-2xl bg-white text-blue-600 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                Mark Complete
              </button>
            ) : (
              <button
                onClick={() => updateJob({ id: heroJob.id, status: "in_progress" })}
                className="w-full h-12 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/25 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Job
              </button>
            )}
          </div>
        ) : (
          /* No upcoming jobs */
          <div className="header-card rounded-3xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Today</p>
            <h2 className="text-xl font-bold text-white mb-1">No jobs scheduled</h2>
            <p className="text-white/60 text-sm mb-4">Your day is open — send a quote?</p>
            <Link href="/quotes/new">
              <button className="h-11 px-5 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/25 text-white font-bold text-sm flex items-center gap-2 active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4" />
                Create Quote
              </button>
            </Link>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/quotes/new">
            <button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 text-sm">
              <FileText className="w-4 h-4" />
              New Quote
            </button>
          </Link>
          <Link href="/jobs">
            <button className="w-full h-14 rounded-2xl bg-white dark:bg-card border border-black/10 dark:border-white/10 text-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm text-sm">
              <Briefcase className="w-4 h-4" />
              Schedule Job
            </button>
          </Link>
        </div>

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/quotes">
            <div className="bg-white dark:bg-card rounded-2xl p-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Quotes Out</p>
              <p className="text-base font-bold text-primary leading-none">{fmt$(outstandingQuotesValue)}</p>
            </div>
          </Link>
          <Link href="/jobs">
            <div className="bg-white dark:bg-card rounded-2xl p-3.5 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-transform">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">This Week</p>
              <p className="text-base font-bold text-blue-500 leading-none">
                {jobsThisWeek}
                <span className="text-[11px] font-semibold text-muted-foreground ml-1">jobs</span>
              </p>
            </div>
          </Link>
          <Link href="/invoices">
            <div className={cn(
              "rounded-2xl p-3.5 border active:scale-[0.98] transition-transform",
              overdueCount > 0
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
                : "bg-white dark:bg-card border-black/5 dark:border-white/5"
            )}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Unpaid</p>
              <p className={cn(
                "text-base font-bold leading-none",
                overdueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {fmt$(unpaidValue)}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Follow-up alerts ────────────────────────────────────── */}
        {followUpsDue && followUpsDue.length > 0 && (
          <Link href="/quotes">
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">
                {followUpsDue.length} quote follow-up{followUpsDue.length !== 1 ? "s" : ""} due
              </p>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Remaining today's jobs ──────────────────────────────── */}
        {remainingJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pt-1">
              Also today
            </p>
            {remainingJobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="bg-white dark:bg-card rounded-2xl px-4 py-3.5 border border-black/5 dark:border-white/5 flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    job.status === "in_progress" ? "bg-blue-500" : "bg-primary"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : "TBD"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {completionJob && (
        <JobCompletionModal
          open={!!completionJob}
          onOpenChange={(v) => { if (!v) setCompletionJob(null); }}
          jobId={completionJob.id}
          jobTitle={completionJob.title}
          customerId={completionJob.customerId}
        />
      )}
    </div>
  );
}
