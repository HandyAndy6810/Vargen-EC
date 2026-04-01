import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { SuccessFlash } from "@/components/SuccessFlash";
import { useTimerEntries, formatDuration } from "@/hooks/use-timers";
import { useUpdateJob } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useCustomer } from "@/hooks/use-customers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Loader2,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
  customerId?: number | null;
  linkedQuoteId?: number | null;
}

export function JobCompletionModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  customerId,
  linkedQuoteId,
}: JobCompletionModalProps) {
  const { data: timerEntries = [] } = useTimerEntries(jobId);
  const updateJob = useUpdateJob();
  const { data: quotes } = useQuotes();
  const { data: customer } = useCustomer(customerId || 0);

  const [, setLocation] = useLocation();
  const [actualHours, setActualHours] = useState<string>("");
  const [extraNotes, setExtraNotes] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [jobCompleted, setJobCompleted] = useState(false);

  // Find linked quote: either by explicit linkedQuoteId or by matching jobId
  const linkedQuote = quotes?.find(
    (q) => (linkedQuoteId && q.id === linkedQuoteId) || q.jobId === jobId
  );

  // Parse estimated hours from quote content JSON
  const estimatedHours = (() => {
    if (!linkedQuote?.content) return null;
    try {
      const parsed = JSON.parse(linkedQuote.content);
      if (typeof parsed.estimatedHours === "number") return parsed.estimatedHours;
      if (typeof parsed.estimatedHours === "string") return parseFloat(parsed.estimatedHours);
    } catch {
      // content is not JSON or doesn't have estimatedHours
    }
    return null;
  })();

  const quotedAmount = linkedQuote ? parseFloat(String(linkedQuote.totalAmount)) : null;

  // Pre-populate actual hours from timer entries
  useEffect(() => {
    if (timerEntries.length > 0) {
      const totalSeconds = timerEntries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );
      const hours = Math.round((totalSeconds / 3600) * 100) / 100;
      setActualHours(hours.toString());
    }
  }, [timerEntries]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setExtraNotes("");
      setJobCompleted(false);
    }
  }, [open]);

  const totalTimerSeconds = timerEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0
  );

  const actualHoursNum = parseFloat(actualHours) || 0;
  const isOverEstimate =
    estimatedHours !== null && actualHoursNum > estimatedHours;
  const isUnderEstimate =
    estimatedHours !== null && actualHoursNum <= estimatedHours;

  const handleComplete = () => {
    const completionData = JSON.stringify({
      actualHours: actualHoursNum,
      extraNotes,
      completedAt: new Date().toISOString(),
      estimatedHours,
      quotedAmount,
    });

    updateJob.mutate(
      {
        id: jobId,
        status: "completed",
        completionData,
      },
      {
        onSuccess: () => {
          setShowFlash(true);
          setJobCompleted(true);
        },
      }
    );
  };

  const handleSendMessage = () => {
    if (customer?.phone) {
      window.open(`sms:${customer.phone}`);
    }
  };

  return (
    <>
    <SuccessFlash
      show={showFlash}
      message="Job Complete!"
      onDone={() => setShowFlash(false)}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2rem] mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {jobCompleted ? "Job Complete!" : "Complete Job"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
            </div>
          </div>
        </DialogHeader>

        {jobCompleted ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground text-center">What would you like to do next?</p>
            {linkedQuote && (
              <Button
                onClick={() => { onOpenChange(false); setLocation(`/quotes/${linkedQuote.id}`); }}
                className="w-full h-14 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Receipt className="w-5 h-5 mr-2" />
                {linkedQuote.status === "invoiced" ? "View Invoice" : "Create Invoice"}
              </Button>
            )}
            {customer?.phone && (
              <Button
                variant="outline"
                onClick={handleSendMessage}
                className="w-full h-12 rounded-2xl text-sm font-bold border-black/10 dark:border-white/10"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Job Complete Message
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-2xl text-sm font-bold"
            >
              Done
            </Button>
          </div>
        ) : (
        <div className="space-y-5 pt-2">
          {/* Timer summary strip */}
          {totalTimerSeconds > 0 && (
            <div className="bg-[#F8F7F5] dark:bg-white/5 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">
                  Time tracked
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(totalTimerSeconds)} across{" "}
                  {timerEntries.length} session
                  {timerEntries.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Estimate vs Actual comparison card */}
          {estimatedHours !== null && (
            <div
              className={cn(
                "rounded-xl p-4 border",
                isUnderEstimate
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Estimated
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {estimatedHours}h
                  </p>
                </div>
                <div className="px-3">
                  {isOverEstimate ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Actual</p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      isOverEstimate
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    {actualHoursNum || "0"}h
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "text-xs text-center mt-2 font-medium",
                  isOverEstimate
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {isOverEstimate
                  ? `${(actualHoursNum - estimatedHours).toFixed(1)}h over estimate`
                  : `${(estimatedHours - actualHoursNum).toFixed(1)}h under estimate`}
              </p>
            </div>
          )}

          {/* Actual hours input */}
          <div className="space-y-1.5">
            <Label>Actual Hours</Label>
            <Input
              type="number"
              step="0.25"
              min="0"
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
              placeholder="e.g. 4.5"
              className="rounded-xl"
            />
            {totalTimerSeconds > 0 && !actualHours && (
              <p className="text-xs text-muted-foreground">
                Pre-filled from timer: {formatDuration(totalTimerSeconds)}
              </p>
            )}
          </div>

          {/* Extra notes */}
          <div className="space-y-1.5">
            <Label>
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Any final notes about the job..."
              className="min-h-[72px] resize-none rounded-xl bg-[#F8F7F5] dark:bg-white/5 border-0"
            />
          </div>

          {/* Quoted amount info */}
          {quotedAmount !== null && (
            <div className="bg-[#F8F7F5] dark:bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Quoted amount
              </span>
              <span className="text-sm font-bold text-foreground">
                ${quotedAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Complete button */}
          <Button
            onClick={handleComplete}
            disabled={updateJob.isPending || !actualHours}
            className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
          >
            {updateJob.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Job
              </>
            )}
          </Button>

          {/* Send SMS button */}
          {customer?.phone && (
            <Button
              variant="outline"
              onClick={handleSendMessage}
              className="w-full h-12 rounded-2xl text-sm font-bold border-black/10 dark:border-white/10"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Job Complete Message
            </Button>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
