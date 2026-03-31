import { useJobs, useCreateJob, useUpdateJob } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useCustomers } from "@/hooks/use-customers";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2, Calendar, Briefcase, FileText, Check, AlertTriangle, XCircle, Search } from "lucide-react";
import { SwipeableRow } from "@/components/SwipeableRow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavAction } from "@/hooks/use-nav-action";
import { RunningLateModal } from "@/components/RunningLateModal";
import type { Job } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isTomorrow,
  startOfDay,
  addMonths, 
  subMonths,
  addDays
} from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const { data: quotes } = useQuotes();
  const { data: customers } = useCustomers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lateJob, setLateJob] = useState<Job | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { mutate: updateJob } = useUpdateJob();

  useNavAction({ label: "New", icon: Plus, onClick: () => setIsDialogOpen(true) }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const selectedDateJobs = jobs?.filter(job => 
    job.scheduledDate && isSameDay(new Date(job.scheduledDate), selectedDate)
  ) || [];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const nextJob = jobs
    ?.filter(job => job.scheduledDate && startOfDay(new Date(job.scheduledDate)) >= startOfDay(new Date()))
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0] || null;

  const nextJobDayLabel = nextJob?.scheduledDate
    ? isToday(new Date(nextJob.scheduledDate)) ? "Today"
      : isTomorrow(new Date(nextJob.scheduledDate)) ? "Tomorrow"
      : format(new Date(nextJob.scheduledDate), "eee d MMM")
    : "";

  const getDayBadge = (day: Date): { count: number; color: "orange" | "yellow" | "green" } | null => {
    const dayJobs = jobs?.filter(job => job.scheduledDate && isSameDay(new Date(job.scheduledDate), day)) || [];
    if (dayJobs.length === 0) return null;
    const hasScheduled = dayJobs.some(j => j.status === "scheduled");
    const hasPending = dayJobs.some(j => j.status === "pending");
    const color = hasScheduled ? "orange" : hasPending ? "yellow" : "green";
    return { count: dayJobs.length, color };
  };

  const selectedDayJobIds = new Set(selectedDateJobs.map(j => j.id));
  const selectedDayEarnings = quotes
    ?.filter(q => q.jobId !== null && q.jobId !== undefined && selectedDayJobIds.has(q.jobId))
    .reduce((sum, q) => sum + parseFloat(q.totalAmount || "0"), 0) || 0;

  return (
    <div className="min-h-screen bg-[#F8F5F2] dark:bg-background pb-32">
      {/* Active Timer Banner */}
      <ActiveTimerBanner />
      {/* Header */}
      <div className="px-6 pt-12 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground">{format(currentDate, "MMMM yyyy")}</p>
          </div>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Next Job Banner */}
        {nextJob && (
          <Link href={`/jobs/${nextJob.id}`}>
            <div className="flex items-center gap-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-2xl px-4 py-3 mb-6 active:scale-[0.98] transition-all cursor-pointer" data-testid="banner-next-job">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Next Job · {nextJobDayLabel}</p>
                <p className="text-sm font-bold truncate text-foreground">{nextJob.title}</p>
              </div>
              <span className="text-[11px] font-semibold text-primary/70 shrink-0">
                {nextJob.scheduledDate ? format(new Date(nextJob.scheduledDate), "h:mm a") : "TBD"}
              </span>
            </div>
          </Link>
        )}

        {/* Calendar Card */}
        <div className="bg-white dark:bg-card rounded-[2.5rem] p-6 shadow-xl border border-black/5 mb-8">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="font-bold text-lg">{format(currentDate, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-bold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const badge = getDayBadge(day);

              const dotColor = badge?.color === "green" ? "bg-green-500"
                : badge?.color === "yellow" ? "bg-yellow-400"
                : "bg-primary";

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  data-testid={`cal-day-${idx}`}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center cursor-pointer rounded-full transition-all",
                    isSelected ? "bg-primary text-white font-bold" : "hover:bg-black/5",
                    !isCurrentMonth && !isSelected && "text-muted-foreground/30"
                  )}
                >
                  <span className="text-sm">{format(day, "d")}</span>
                  {badge && !isSelected && (
                    badge.count > 1 ? (
                      <span className={cn(
                        "absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-black rounded-full px-1 leading-3 text-white",
                        dotColor
                      )}>
                        {badge.count}
                      </span>
                    ) : (
                      <div className={cn("absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full", dotColor)} />
                    )
                  )}
                  {badge && isSelected && (
                    badge.count > 1 ? (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-black rounded-full px-1 leading-3 bg-white/30 text-white">
                        {badge.count}
                      </span>
                    ) : (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline / Agenda */}
        <div className="space-y-4">
          {search.trim() ? (() => {
            const s = search.toLowerCase();
            const matches = (jobs || []).filter(j =>
              j.title.toLowerCase().includes(s) ||
              (j.description || "").toLowerCase().includes(s)
            ).sort((a, b) =>
              new Date(b.scheduledDate || 0).getTime() - new Date(a.scheduledDate || 0).getTime()
            );
            return (
              <>
                <p className="text-sm font-bold text-muted-foreground px-1">{matches.length} result{matches.length !== 1 ? "s" : ""} for "{search}"</p>
                {matches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No jobs matched</div>
                ) : matches.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="bg-white dark:bg-card px-4 py-3.5 rounded-xl border border-black/5 dark:border-white/10 flex items-center gap-3 active:scale-[0.98] transition-transform">
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0",
                        job.status === "completed" ? "bg-green-500" :
                        job.status === "cancelled" ? "bg-red-400" :
                        job.status === "in_progress" ? "bg-blue-500" : "bg-primary"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.scheduledDate ? format(new Date(job.scheduledDate), "eee d MMM · h:mm a") : "Unscheduled"}
                          {customers?.find(c => c.id === job.customerId)?.name && ` · ${customers?.find(c => c.id === job.customerId)?.name}`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  </Link>
                ))}
              </>
            );
          })() : (
          <>
          <div className="flex justify-between items-center px-1 mb-4">
            <h3 className="text-xl font-bold text-foreground">
              {isSameDay(selectedDate, new Date()) ? "Today's Schedule" : format(selectedDate, "EEEE, MMM d")}
            </h3>
            <span className="text-sm font-medium text-muted-foreground bg-white dark:bg-card px-3 py-1 rounded-full shadow-sm border border-black/5">
              {selectedDateJobs.length} {selectedDateJobs.length === 1 ? 'Job' : 'Jobs'}
            </span>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-xl border border-black/5 dark:border-white/10 px-4 py-3.5 flex items-center gap-3">
                <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/5 rounded" />
                  <Skeleton className="h-2.5 w-1/3 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
            ))
          ) : selectedDateJobs.length === 0 ? (
            <div
              onClick={() => setIsDialogOpen(true)}
              className="bg-white/50 dark:bg-card/50 border-2 border-dashed border-black/10 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5 rounded-3xl p-12 text-center cursor-pointer transition-all active:scale-[0.98]"
              data-testid="button-add-job-empty"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-foreground">Schedule a Job</p>
              <p className="text-sm text-muted-foreground mt-1">Tap to add a job for this day</p>
            </div>
          ) : (
            <>
              {selectedDateJobs.map(job => {
                const statusDot =
                  job.status === "completed" ? "bg-green-500"
                  : job.status === "in_progress" ? "bg-blue-500"
                  : job.status === "pending" ? "bg-yellow-400"
                  : job.status === "cancelled" ? "bg-red-400"
                  : "bg-primary";
                const statusBadge = job.status === "completed"
                  ? { label: "Completed", cls: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" }
                  : job.status === "in_progress"
                  ? { label: "In Progress", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" }
                  : job.status === "pending"
                  ? { label: "Pending", cls: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" }
                  : job.status === "cancelled"
                  ? { label: "Cancelled", cls: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800" }
                  : { label: "Scheduled", cls: "bg-orange-50 dark:bg-orange-900/20 text-primary border-orange-200 dark:border-orange-800" };
                const canCancel = job.status !== "completed" && job.status !== "cancelled";
                const customerName = customers?.find(c => c.id === job.customerId)?.name;
                return (
                  <SwipeableRow
                    key={job.id}
                    className="rounded-xl"
                    actions={[
                      ...(job.status === "scheduled" ? [{
                        label: "Running Late",
                        icon: <AlertTriangle className="w-4 h-4 text-white" />,
                        bgClass: "bg-amber-400/90",
                        onClick: () => setLateJob(job),
                      }] : []),
                      ...(canCancel ? [{
                        label: "Cancel",
                        icon: <XCircle className="w-4 h-4 text-white" />,
                        bgClass: "bg-red-400/90",
                        onClick: () => setConfirmCancelId(job.id),
                      }] : []),
                    ]}
                  >
                  <Link href={`/jobs/${job.id}`}>
                    <div className="bg-white dark:bg-card px-4 py-3.5 rounded-xl border border-black/5 dark:border-white/10 flex items-center gap-3 active:scale-[0.98] transition-transform">
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", statusDot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : "TBD"}
                          {customerName && ` · ${customerName}`}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", statusBadge.cls)}>
                        {statusBadge.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  </Link>
                  </SwipeableRow>
                );
              })}

              {/* Day earnings preview */}
              {selectedDayEarnings > 0 && (
                <div className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm border border-black/5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Est. day earnings</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${selectedDayEarnings.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </>
          )}
          </>)}
        </div>
      </div>

      <CreateJobDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        defaultDate={format(selectedDate, "yyyy-MM-dd")}
      />

      <AlertDialog open={confirmCancelId !== null} onOpenChange={(o) => { if (!o) setConfirmCancelId(null); }}>
        <AlertDialogContent className="rounded-[2rem] mx-4 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Cancel Job?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the job as cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep Job</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (confirmCancelId !== null) {
                  updateJob({ id: confirmCancelId, status: "cancelled" });
                  setConfirmCancelId(null);
                }
              }}
            >
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lateJob && (
        <RunningLateModal 
          open={!!lateJob} 
          onOpenChange={(v) => { if (!v) setLateJob(null); }} 
          job={lateJob} 
        />
      )}
    </div>
  );
}

function CustomerName({ id }: { id: number }) {
  const { data: customers } = useCustomers();
  const customer = customers?.find(c => c.id === id);
  if (!customer) return null;
  return (
    <div className="flex items-center text-xs font-bold text-muted-foreground bg-muted w-fit px-2 py-1 rounded-lg border border-border">
      <User className="w-3 h-3 mr-1.5" />
      {customer.name}
    </div>
  );
}

function CreateJobDialog({ open, onOpenChange, defaultDate }: { open: boolean, onOpenChange: (open: boolean) => void, defaultDate: string }) {
  const { mutate: createJob, isPending: isCreating } = useCreateJob();
  const { mutate: updateJob, isPending: isUpdating } = useUpdateJob();
  const { data: customers } = useCustomers();
  const { data: allJobs } = useJobs();
  const { data: allQuotes } = useQuotes();

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [linkedJobId, setLinkedJobId] = useState("");
  const [linkedQuoteId, setLinkedQuoteId] = useState("");
  const [formData, setFormData] = useState({ title: "", description: "", customerId: "", scheduledDate: defaultDate, time: "09:00" });

  const unscheduledJobs = allJobs?.filter(j => !j.scheduledDate) || [];
  const unassignedQuotes = allQuotes?.filter(q => !q.jobId) || [];

  const isPending = isCreating || isUpdating;

  const handlePickJob = (jobId: string) => {
    setLinkedJobId(jobId);
    setLinkedQuoteId("");
    const job = allJobs?.find(j => j.id === parseInt(jobId));
    if (job) {
      setFormData({
        ...formData,
        title: job.title,
        description: job.description || "",
        customerId: job.customerId ? job.customerId.toString() : "",
      });
    }
  };

  const handlePickQuote = (quoteId: string) => {
    setLinkedQuoteId(quoteId);
    setLinkedJobId("");
    const quote = allQuotes?.find(q => q.id === parseInt(quoteId));
    if (quote) {
      setFormData({
        ...formData,
        title: `Quote #${quote.id}`,
        description: quote.content || "",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledDate = new Date(`${formData.scheduledDate}T${formData.time}`);

    if (mode === "existing" && linkedJobId) {
      updateJob({
        id: parseInt(linkedJobId),
        scheduledDate: scheduledDate,
        status: "scheduled",
      }, {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        }
      });
    } else {
      createJob({
        title: formData.title,
        description: formData.description,
        customerId: formData.customerId ? parseInt(formData.customerId) : undefined,
        scheduledDate: scheduledDate,
        status: "scheduled"
      }, {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", customerId: "", scheduledDate: defaultDate, time: "09:00" });
    setLinkedJobId("");
    setLinkedQuoteId("");
    setMode("new");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[460px] rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">New Schedule Item</DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="bg-muted p-1 rounded-2xl flex gap-1 mb-6">
          <button 
            type="button"
            onClick={() => { setMode("new"); setLinkedJobId(""); setLinkedQuoteId(""); }}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              mode === "new" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Create New
          </button>
          <button 
            type="button"
            onClick={() => setMode("existing")}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              mode === "existing" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Link Existing
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "existing" && (
            <div className="space-y-4">
              {/* Unscheduled Jobs */}
              {unscheduledJobs.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Unscheduled Jobs
                  </Label>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {unscheduledJobs.map(job => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => handlePickJob(job.id.toString())}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3",
                          linkedJobId === job.id.toString()
                            ? "bg-[#FFF1EB] dark:bg-primary/10 border-primary"
                            : "bg-white dark:bg-card border-black/5 hover:border-black/10"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{job.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{job.description || "No description"}</div>
                        </div>
                        {linkedJobId === job.id.toString() && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unassigned Quotes */}
              {unassignedQuotes.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Unassigned Quotes
                  </Label>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {unassignedQuotes.map(quote => (
                      <button
                        key={quote.id}
                        type="button"
                        onClick={() => handlePickQuote(quote.id.toString())}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3",
                          linkedQuoteId === quote.id.toString()
                            ? "bg-[#FFF1EB] dark:bg-primary/10 border-primary"
                            : "bg-white dark:bg-card border-black/5 hover:border-black/10"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">Quote #{quote.id}</div>
                          <div className="text-xs text-muted-foreground truncate">{quote.content || "No description"}</div>
                        </div>
                        <div className="text-sm font-bold text-primary shrink-0">${Number(quote.totalAmount).toLocaleString()}</div>
                        {linkedQuoteId === quote.id.toString() && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unscheduledJobs.length === 0 && unassignedQuotes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted rounded-2xl">
                  <p className="font-medium">Nothing to link</p>
                  <p className="text-sm mt-1">All jobs and quotes are already scheduled</p>
                </div>
              )}

              <div className="border-t border-black/5 pt-4" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-bold">Job Title</Label>
            <Input 
              required
              placeholder="e.g. Fix leaky faucet"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="rounded-xl h-12 border-black/10"
              data-testid="input-job-title"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="font-bold">Customer</Label>
            <Select 
              value={formData.customerId} 
              onValueChange={v => setFormData({...formData, customerId: v})}
            >
              <SelectTrigger className="rounded-xl h-12 border-black/10" data-testid="select-customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Date</Label>
              <Input 
                type="date"
                value={formData.scheduledDate}
                onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                className="rounded-xl h-12 border-black/10"
                data-testid="input-date"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Time</Label>
              <Input 
                type="time"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="rounded-xl h-12 border-black/10"
                data-testid="input-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Notes</Label>
            <Textarea 
              placeholder="Any details to remember..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl min-h-[100px] border-black/10"
              data-testid="textarea-notes"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending || (mode === "existing" && !linkedJobId && !linkedQuoteId)} 
            className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20"
            data-testid="button-save-schedule"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save to Schedule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
