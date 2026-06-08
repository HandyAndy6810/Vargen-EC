import { Header } from "@/components/Header";
import { useJob, useUpdateJob } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useRoute, Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Loader2, Calendar, User, MapPin, Phone, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Play, DollarSign } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { RunningLateModal } from "@/components/RunningLateModal";
import { JobCompletionModal } from "@/components/JobCompletionModal";
import { useQuotes } from "@/hooks/use-quotes";

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const id = parseInt(params?.id || "0");
  const { data: job, isLoading } = useJob(id);
  const { data: customers } = useCustomers();
  const { data: quotes } = useQuotes();
  const { mutate: updateJob, isPending: isUpdating } = useUpdateJob();
  const { data: reconciliation } = useQuery({
    queryKey: [api.jobs.reconciliation.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.reconciliation.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reconciliation");
      return res.json();
    },
    enabled: !!id && job?.status === "completed",
  });
  const [showLateModal, setShowLateModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const customer = customers?.find(c => c.id === job?.customerId);
  const linkedQuote = quotes?.find(q => q.jobId === job?.id);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!job) return <div className="p-8 text-center">Job not found</div>;

  // Parse completion data if job is completed
  let completionData: any = null;
  if (job.completionData) {
    try { completionData = JSON.parse(job.completionData); } catch {}
  }

  const handleStatusChange = (status: string) => {
    updateJob({ id: job.id, status });
  };

  return (
    <div className="space-y-6 pb-28">
      <Header title="Job Details" showBack />

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
          <span className={cn("px-3 py-1 rounded-full text-sm font-semibold capitalize",
            job.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            job.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            job.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          )}>
            {job.status === 'in_progress' ? 'In Progress' : job.status}
          </span>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled For</p>
              <p className="font-semibold text-lg">
                {job.scheduledDate ? format(new Date(job.scheduledDate), "EEEE, MMM d, yyyy") : "Unscheduled"}
              </p>
              <p className="text-muted-foreground">
                {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : ""}
              </p>
            </div>
          </div>

          {customer && (
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-accent/10 rounded-xl text-accent mt-0.5">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-semibold text-lg">{customer.name}</p>
                {customer.phone && (
                  <div className="flex items-center text-sm text-foreground/80">
                    <Phone className="w-3.5 h-3.5 mr-2" /> {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center text-sm text-foreground/80">
                    <MapPin className="w-3.5 h-3.5 mr-2" /> {customer.address}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{job.description || "No description."}</p>
          </div>
        </div>
      </div>

      {/* Completion Summary (for completed jobs) */}
      {completionData && (
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Completion Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Actual Hours</p>
              <p className="text-2xl font-bold">{completionData.actualHours || 0}h</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Estimated Hours</p>
              <p className="text-2xl font-bold">{completionData.estimatedHours || "N/A"}{completionData.estimatedHours ? "h" : ""}</p>
            </div>
          </div>
          {completionData.estimatedHours && completionData.actualHours && (
            <div className={cn("mt-3 p-3 rounded-xl flex items-center gap-2",
              completionData.actualHours <= completionData.estimatedHours
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            )}>
              {completionData.actualHours <= completionData.estimatedHours
                ? <><TrendingDown className="w-4 h-4" /> Under budget by {(completionData.estimatedHours - completionData.actualHours).toFixed(1)}h</>
                : <><TrendingUp className="w-4 h-4" /> Over budget by {(completionData.actualHours - completionData.estimatedHours).toFixed(1)}h</>
              }
            </div>
          )}
          {completionData.extraNotes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{completionData.extraNotes}</p>
            </div>
          )}
          {completionData.quotedAmount && (
            <div className="mt-3 text-sm text-muted-foreground">
              Quoted: ${Number(completionData.quotedAmount).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Profit check (quote-vs-actual reconciliation) */}
      {reconciliation?.available && (() => {
        const r = reconciliation;
        const actualCost = (r.actualLabourCost || 0) + (r.actualMaterialCost || 0);
        const profitPositive = (r.realProfit ?? 0) > 0;

        const varianceParts: string[] = [];
        if (r.hoursVariance != null) {
          const abs = Math.abs(r.hoursVariance);
          varianceParts.push(
            abs > 0.05
              ? `Took ${abs.toFixed(1)} hrs ${r.hoursVariance > 0 ? "longer" : "less"} than quoted`
              : "Right on the estimated hours"
          );
        }
        if (r.realMarginPercent != null) {
          varianceParts.push(`real margin came in at ${r.realMarginPercent.toFixed(0)}%`);
        }
        const varianceLine = varianceParts.length ? `${varianceParts.join(" — ")}.` : null;

        return (
          <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Profit Check
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Quoted</p>
                <p className="text-lg font-bold">
                  {r.quotedAmount != null ? `$${Math.round(r.quotedAmount).toLocaleString()}` : "—"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Actual cost</p>
                <p className="text-lg font-bold">${Math.round(actualCost).toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Real profit</p>
                <p className={cn("text-lg font-bold", profitPositive ? "text-green-600" : "text-red-500")}>
                  {r.realProfit != null ? `$${Math.round(r.realProfit).toLocaleString()}` : "—"}
                  {r.realMarginPercent != null && (
                    <span className="text-sm font-semibold"> ({r.realMarginPercent.toFixed(0)}%)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              Labour ${Math.round(r.actualLabourCost || 0).toLocaleString()}
              {r.actualHours != null ? ` (${r.actualHours}h)` : ""}
              {"  ·  "}
              Materials ${Math.round(r.actualMaterialCost || 0).toLocaleString()}
            </div>
            {varianceLine && (
              <p className="mt-2 text-sm font-medium">{varianceLine}</p>
            )}
          </div>
        );
      })()}

      {/* Secondary actions — cancel + running late */}
      {(job.status !== "completed" && job.status !== "cancelled") && (
        <div className={cn("grid gap-3", job.status === "scheduled" ? "grid-cols-2" : "grid-cols-1")}>
          {job.status === "scheduled" && (
            <Button
              onClick={() => setShowLateModal(true)}
              variant="outline"
              className="h-12 rounded-xl border border-orange-200 bg-[#FFF1EB] dark:bg-primary/10 text-primary font-bold text-sm hover:bg-[#FFE5D9]"
              data-testid="button-running-late"
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Running Late
            </Button>
          )}
          <Button
            variant="outline"
            className="h-12 rounded-xl border border-red-200 dark:border-red-900 text-red-500 font-bold text-sm hover:bg-red-50"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isUpdating}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Cancel Job
          </Button>
        </div>
      )}

      <Button className="w-full h-12 rounded-xl text-sm font-semibold bg-primary" asChild>
        <Link href={`/quotes/new?jobId=${job.id}`}>Create Quote for Job</Link>
      </Button>

      {/* Sticky primary action bar */}
      {(job.status === "scheduled" || job.status === "pending" || job.status === "in_progress") && (
        <div className="fixed bottom-24 left-0 right-0 px-5 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            {(job.status === "scheduled" || job.status === "pending") && (
              <Button
                className="w-full h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30"
                onClick={() => handleStatusChange("in_progress")}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2 fill-white" />}
                Start Job
              </Button>
            )}
            {job.status === "in_progress" && (
              <Button
                className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/30"
                onClick={() => setShowCompletionModal(true)}
                disabled={isUpdating}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      )}

      <RunningLateModal
        open={showLateModal}
        onOpenChange={setShowLateModal}
        job={job}
      />

      <JobCompletionModal
        open={showCompletionModal}
        onOpenChange={setShowCompletionModal}
        jobId={job.id}
        jobTitle={job.title}
        customerId={job.customerId}
        linkedQuoteId={linkedQuote?.id}
      />

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="rounded-[2rem] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Cancel Job?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the job as cancelled. You can reopen it from the job list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep Job</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => handleStatusChange("cancelled")}
            >
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
