import { useJobs, useUpdateJob } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useInvoices } from "@/hooks/use-invoices";
import { useFollowUpsDue } from "@/hooks/use-follow-ups";
import { useCustomers } from "@/hooks/use-customers";
import { useWidgetConfig } from "@/hooks/use-widget-config";
import { useAuth } from "@/hooks/use-auth";
import { useUserSettings } from "@/hooks/use-user-settings";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { JobCompletionModal } from "@/components/JobCompletionModal";
import { QuickQuoteSheet } from "@/components/QuickQuoteSheet";
import { WidgetCustomiseSheet } from "@/components/WidgetCustomiseSheet";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid, CheckCircle2, Play, Sparkles, ChevronRight,
  MapPin, Clock, FileText,
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
  const { data: userSettings } = useUserSettings();

  const [completionJob, setCompletionJob] = useState<any>(null);
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const [showCustomise, setShowCustomise] = useState(false);

  const now = new Date();
  const firstName = user?.firstName || "mate";
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "VG";

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

  const remainingJobs = useMemo(() =>
    todayJobs.filter(j =>
      j.id !== heroJob?.id &&
      j.status !== "completed" &&
      j.status !== "cancelled"
    ),
    [todayJobs, heroJob]
  );

  // Weekly goal progress
  const weeklyGoal = userSettings?.weeklyGoal || 0;
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekRevenue = useMemo(() =>
    (invoices || [])
      .filter(i => i.status === "paid" && i.paidDate &&
        new Date(i.paidDate) >= weekStart && new Date(i.paidDate) <= weekEnd)
      .reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0),
    [invoices]
  );
  const goalPct = weeklyGoal > 0 ? Math.min((weekRevenue / weeklyGoal) * 100, 100) : 0;
  const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);

  // Pipeline counts from quotes
  const pipeline = useMemo(() => {
    const q = quotes || [];
    return [
      { n: q.filter(x => x.status === "draft").length, l: "Draft", c: "text-muted-foreground", bg: "bg-card", ring: "border-border" },
      { n: q.filter(x => x.status === "sent" || x.status === "viewed").length, l: "Sent", c: "text-blueStatus", bg: "bg-blueSoft", ring: "border-[#c8dcff]" },
      { n: q.filter(x => x.status === "accepted").length, l: "Accepted", c: "text-greenStatus", bg: "bg-greenSoft", ring: "border-[#bde2c9]" },
      { n: q.filter(x => x.status === "overdue").length, l: "Overdue", c: "text-primary", bg: "bg-orangeSoft", ring: "border-[#f8c59f]" },
    ];
  }, [quotes]);

  const pipelineTotal = useMemo(() =>
    (quotes || [])
      .filter(q => ["draft", "sent", "viewed", "accepted"].includes(q.status || ""))
      .reduce((s, q) => s + parseFloat(q.totalAmount || "0"), 0),
    [quotes]
  );
  const pipelineTotalStr = pipelineTotal >= 1000
    ? `$${(pipelineTotal / 1000).toFixed(1)}k`
    : `$${Math.round(pipelineTotal)}`;

  // Overdue invoices
  const overdueInvoices = useMemo(() =>
    (invoices || []).filter(i => i.status === "overdue"),
    [invoices]
  );
  const overdueCount = overdueInvoices.length;
  const overdueTotal = useMemo(() =>
    overdueInvoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0),
    [overdueInvoices]
  );

  const heroLabel = heroJob?.scheduledDate
    ? isToday(new Date(heroJob.scheduledDate)) ? "Today"
      : isTomorrow(new Date(heroJob.scheduledDate)) ? "Tomorrow"
      : format(new Date(heroJob.scheduledDate), "eee d MMM")
    : "";

  const jobCustomerName = (job: any) => {
    if (job.customerId) return customers?.find((c: any) => c.id === job.customerId)?.name;
    return null;
  };

  const getJobDotColor = (job: any) => {
    if (job.status === "in_progress" || job.id === heroJob?.id) return "#f26a2a";
    return "#1f6feb";
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      <ActiveTimerBanner />

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed top-0 right-0 w-[340px] h-[340px] opacity-[0.08] rounded-full"
        style={{ background: "radial-gradient(circle, #f26a2a, transparent 70%)", transform: "translate(30%, -30%)" }} />

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-14 pb-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-[14px] font-extrabold text-primary shrink-0"
          style={{ letterSpacing: -0.2 }}>
          {initials}
        </div>
        {/* Weather pill (static) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}>
          <div className="w-6 h-6 rounded-full bg-[#d9ecff] flex items-center justify-center text-[13px]">☀</div>
          <span className="text-[12px] font-bold text-foreground">24°</span>
          <span className="text-[11px] text-muted-foreground">· Sydney</span>
        </div>
        <button
          onClick={() => setShowCustomise(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          data-testid="button-customise-home"
        >
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* ── Editorial heading ───────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        <Eyebrow className="mb-1.5">{format(now, "eee d MMM").toUpperCase()}</Eyebrow>
        <h1 className="font-extrabold text-foreground leading-[0.96] tracking-[-1.5px]" style={{ fontSize: 42 }}>
          G'day,<br />
          <span className="text-primary">{firstName}.</span>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2.5 leading-[1.4] max-w-[280px]">
          {todayJobs.length > 0
            ? <>{todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""} booked today.{weeklyGoal > 0 && weekRevenue < weeklyGoal ? <> ${Math.round(weeklyGoal - weekRevenue).toLocaleString()} til weekly goal.</> : null}{" "}</>
            : "Your day is open — send a quote? "
          }
          <span className="text-muted-foreground/60">Let's not touch a single form.</span>
        </p>
      </div>

      <div className="px-5 space-y-3 max-w-2xl mx-auto">

        {/* ── Up-next hero card ───────────────────────────────────── */}
        {heroJob ? (
          <div className="header-card">
            <div className="relative z-10 flex items-center gap-2 mb-3">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                heroJob.status === "in_progress"
                  ? "bg-primary animate-pulse"
                  : "bg-primary/70"
              )} />
              <Eyebrow className="text-white/60">
                {heroJob.status === "in_progress"
                  ? "▶ In Progress"
                  : `Up next · ${heroLabel}${heroJob.scheduledDate ? " · " + format(new Date(heroJob.scheduledDate), "h:mm a") : ""}`}
              </Eyebrow>
              {heroJob.scheduledDate && heroJob.status !== "in_progress" && (
                <div className="ml-auto px-2.5 py-1 rounded-full bg-white/12 text-[10px] font-extrabold text-white/80 shrink-0">
                  {format(new Date(heroJob.scheduledDate), "h:mm a")}
                </div>
              )}
            </div>

            <div className="relative z-10">
              <h2 className="text-[26px] font-extrabold text-white leading-[1.1] tracking-[-0.6px] mb-1.5">
                {heroJob.title}
              </h2>
              {jobCustomerName(heroJob) && (
                <p className="text-[13px] text-white/55 mb-0.5">{jobCustomerName(heroJob)}</p>
              )}
              {heroJob.address && (
                <div className="flex items-center gap-1.5 mb-5">
                  <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <p className="text-[13px] text-white/50 truncate">{heroJob.address}</p>
                </div>
              )}
              {!heroJob.address && <div className="mb-5" />}

              <div className="flex gap-2">
                {heroJob.status === "in_progress" ? (
                  <button
                    onClick={() => setCompletionJob(heroJob)}
                    className="btn-orange flex-1 h-[52px] flex items-center justify-center gap-2 text-[15px] font-extrabold active:scale-[0.98] transition-transform"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Mark Complete
                  </button>
                ) : (
                  <button
                    onClick={() => updateJob({ id: heroJob.id, status: "in_progress" })}
                    className="btn-orange flex-1 h-[52px] flex items-center justify-center gap-2 text-[15px] font-extrabold active:scale-[0.98] transition-transform"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start job
                  </button>
                )}
                {heroJob.address && (
                  <button className="w-[52px] h-[52px] rounded-[16px] bg-white/10 border border-white/15 flex items-center justify-center text-[16px]">
                    📍
                  </button>
                )}
                {jobCustomerName(heroJob) && (
                  <button className="w-[52px] h-[52px] rounded-[16px] bg-white/10 border border-white/15 flex items-center justify-center text-[16px]">
                    💬
                  </button>
                )}
              </div>
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
                className="btn-orange h-[52px] px-6 flex items-center gap-2 text-[15px] font-extrabold active:scale-[0.98] transition-transform"
              >
                <Sparkles className="w-4 h-4" /> Quick Quote
              </button>
            </div>
          </div>
        )}

        {/* ── AI Rail — orange, full card ─────────────────────────── */}
        {isOn("quick-quote") && (
          <button
            onClick={() => setShowQuickQuote(true)}
            className="w-full text-left active:scale-[0.98] transition-transform"
            data-testid="widget-quick-quote"
          >
            <div className="rounded-[24px] p-[18px] text-white relative overflow-hidden"
              style={{
                background: "#f26a2a",
                boxShadow: "0 14px 28px rgba(242,106,42,0.30)",
              }}>
              {/* Faint radial highlight */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 40%)" }} />
              <div className="flex items-center gap-3 relative">
                <div className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 border border-white/35"
                  style={{ background: "rgba(255,255,255,0.20)" }}>
                  <span className="text-[22px]">✦</span>
                </div>
                <div className="flex-1">
                  <Eyebrow className="text-white/75 mb-1">Quote with a sentence</Eyebrow>
                  <p className="text-[16px] font-extrabold leading-[1.2] tracking-[-0.2px]">
                    Draft a quote in one sentence
                  </p>
                </div>
                <div className="w-10 h-10 rounded-[12px] bg-white flex items-center justify-center shrink-0 text-primary">
                  🎤
                </div>
              </div>
            </div>
          </button>
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

        {/* ── Weekly goal block ────────────────────────────────────── */}
        {weeklyGoal > 0 && (
          <div className="bg-cream dark:bg-card rounded-[24px] px-5 py-[22px] border border-black/8 dark:border-white/5 relative overflow-hidden">
            <Eyebrow className="mb-2">Week {weekNumber} revenue</Eyebrow>
            <div className="flex items-end gap-3 mb-3.5">
              <span className="font-extrabold text-foreground leading-[0.95]" style={{ fontSize: 44, letterSpacing: -1.5 }}>
                ${weekRevenue.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[14px] text-muted-foreground font-semibold mb-1.5">
                / ${weeklyGoal.toLocaleString()} goal
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-[10px] rounded-full bg-paperDeep overflow-hidden mb-2.5">
              <div
                className="absolute top-0 left-0 bottom-0 rounded-full transition-all"
                style={{
                  width: `${goalPct}%`,
                  background: "linear-gradient(90deg, #f26a2a, #d94d0e)",
                }}
              />
              {[25, 50, 75].map(m => (
                <div key={m} className="absolute top-0.5 bottom-0.5"
                  style={{ left: `${m}%`, width: 1.5, background: "rgba(255,255,255,0.6)" }} />
              ))}
            </div>

            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
              <span>
                <b className="text-primary">{goalPct.toFixed(0)}%</b> there
                {weeklyGoal > weekRevenue && <> · ${Math.round(weeklyGoal - weekRevenue).toLocaleString()} to go</>}
              </span>
              <span>{todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""} today</span>
            </div>
          </div>
        )}

        {/* ── Quote pipeline chips ─────────────────────────────────── */}
        {isOn("stats") && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <Eyebrow className="mb-1">Quote pipeline</Eyebrow>
                <p className="text-[18px] font-extrabold text-foreground tracking-[-0.3px]">
                  {(quotes || []).length} on the go · <span className="text-primary">{pipelineTotalStr} out</span>
                </p>
              </div>
              <Link href="/quotes">
                <span className="text-[11px] font-extrabold text-primary">See all →</span>
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
              {pipeline.map(s => (
                <Link key={s.l} href="/quotes">
                  <div className={cn(
                    "rounded-[20px] px-4 py-3.5 border min-w-[108px] flex flex-col gap-1 shrink-0",
                    s.bg, s.ring
                  )}>
                    <span className={cn("text-[28px] font-extrabold leading-none", s.c)} style={{ letterSpacing: -0.8 }}>
                      {s.n}
                    </span>
                    <Eyebrow className={cn("text-[10px]", s.c)}>{s.l}</Eyebrow>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Today's schedule timeline ────────────────────────────── */}
        {isOn("today-schedule") && todayJobs.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between px-1 mb-3.5">
              <div>
                <Eyebrow className="mb-1">Today · {todayJobs.length} stop{todayJobs.length !== 1 ? "s" : ""}</Eyebrow>
                <p className="text-[18px] font-extrabold text-foreground tracking-[-0.3px]">Out the door by 9.</p>
              </div>
              <Link href="/jobs">
                <span className="text-[11px] font-extrabold text-primary">Calendar →</span>
              </Link>
            </div>
            <div>
              {todayJobs.map((job, i) => {
                const dotColor = getJobDotColor(job);
                const isLast = i === todayJobs.length - 1;
                const isActive = job.status === "in_progress" || job.id === heroJob?.id;
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex gap-3 active:scale-[0.99] transition-transform">
                      {/* Time gutter */}
                      <div className="flex flex-col items-end w-[54px] shrink-0 relative pt-1.5 pr-[14px]">
                        {job.scheduledDate ? (
                          <>
                            <p className="text-[12px] font-extrabold text-foreground leading-none" style={{ letterSpacing: 0.2 }}>
                              {format(new Date(job.scheduledDate), "h:mm")}
                            </p>
                            <p className="text-[9.5px] font-extrabold uppercase text-muted-foreground leading-none mt-0.5" style={{ letterSpacing: 0.6 }}>
                              {format(new Date(job.scheduledDate), "a")}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] font-bold text-muted-foreground">TBD</p>
                        )}
                        {/* Vertical rail */}
                        {!isLast && (
                          <div className="absolute right-[5px] top-[22px] bottom-[-14px] w-[2px] rounded-full opacity-30"
                            style={{ background: dotColor }} />
                        )}
                        {/* Dot */}
                        <div className="absolute right-[-1px] top-[6px] w-3 h-3 rounded-full border-[3px]"
                          style={{ background: dotColor, borderColor: "hsl(var(--background))", boxShadow: `0 0 0 1.5px ${dotColor}` }} />
                      </div>

                      {/* Job card */}
                      <div className={cn(
                        "flex-1 rounded-[18px] px-3.5 py-3 border mb-3.5",
                        isActive
                          ? "bg-vgnBlack border-transparent"
                          : "bg-white dark:bg-card border-black/5 dark:border-white/5"
                      )}
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-[14px] font-extrabold truncate",
                              isActive ? "text-white" : "text-foreground"
                            )} style={{ letterSpacing: -0.2 }}>
                              {job.title}
                            </p>
                            {jobCustomerName(job) && (
                              <p className={cn(
                                "text-[11px] mt-0.5 truncate",
                                isActive ? "text-white/55" : "text-muted-foreground"
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
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Sig footer ───────────────────────────────────────────── */}
      <div className="px-5 py-7 text-center">
        <p className="text-[11px] text-muted-foreground font-semibold" style={{ letterSpacing: 0.2 }}>
          Admin for people who'd rather be on the tools.
        </p>
        <p className="text-[10px] text-muted-foreground font-extrabold mt-1.5 uppercase" style={{ letterSpacing: 2 }}>
          VARGENEZEY · v1.0
        </p>
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
