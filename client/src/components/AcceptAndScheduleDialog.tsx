import { useState } from "react";
import { Calendar, CheckCircle2, Loader2, Link as LinkIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/use-customers";
import { useJobs } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AcceptAndScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: number;
  totalAmount: number;
  initialTitle: string;
  initialCustomerId: number | undefined;
  initialSummary: string;
  onSuccess: (newJobId: number) => void;
}

export default function AcceptAndScheduleDialog({
  open,
  onOpenChange,
  quoteId,
  totalAmount,
  initialTitle,
  initialCustomerId,
  initialSummary,
  onSuccess,
}: AcceptAndScheduleDialogProps) {
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getNextWeekday = () => {
    const d = new Date();
    if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
    return format(d, "yyyy-MM-dd");
  };

  const [mode, setMode] = useState<"schedule" | "draft" | "link">("schedule");
  const [title, setTitle] = useState(initialTitle);
  const [customerId, setCustomerId] = useState<string>(
    initialCustomerId?.toString() ?? ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    getNextWeekday()
  );
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("2");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState(initialSummary);
  const [linkJobId, setLinkJobId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form fields when dialog opens with fresh props
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMode("schedule");
      setTitle(initialTitle);
      setCustomerId(initialCustomerId?.toString() ?? "");
      setScheduledDate(getNextWeekday());
      setTime("09:00");
      setDuration("2");
      setAddress("");
      setNotes(initialSummary);
      setLinkJobId("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (mode === "link") {
      if (!linkJobId) return;
      setIsSubmitting(true);
      try {
        const quoteRes = await fetch(
          buildUrl(api.quotes.update.path, { id: quoteId }),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "accepted", jobId: parseInt(linkJobId) }),
          }
        );
        if (!quoteRes.ok) throw new Error("Failed to link quote");
        queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });
        toast({ title: "Quote accepted", description: "Linked to the existing job." });
        onSuccess(parseInt(linkJobId));
      } catch {
        toast({ title: "Something went wrong", description: "Check your connection and try again.", variant: "destructive" });
        setIsSubmitting(false);
      }
      return;
    }

    if (!title.trim() || !customerId) return;
    setIsSubmitting(true);

    try {
      // Step 1: Create the job (with or without scheduled date)
      const jobBody: any = {
        title: title.trim(),
        customerId: parseInt(customerId),
        description: notes.trim() || undefined,
        address: address.trim() || undefined,
        estimatedDuration: duration ? Math.round(parseFloat(duration) * 60) : undefined,
        status: mode === "draft" ? "pending" : "scheduled",
      };
      if (mode === "schedule") {
        jobBody.scheduledDate = new Date(`${scheduledDate}T${time}`).toISOString();
      }

      const jobRes = await fetch(api.jobs.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(jobBody),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        toast({
          title: mode === "draft" ? "Save failed" : "Scheduling failed",
          description: err.message || "Could not create job. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const newJob = await jobRes.json();

      // Step 2: Accept the quote and link it to the new job
      const quoteRes = await fetch(
        buildUrl(api.quotes.update.path, { id: quoteId }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "accepted", jobId: newJob.id }),
        }
      );

      if (!quoteRes.ok) {
        toast({
          title: "Partial failure",
          description: `Job #${newJob.id} was created but the quote link failed. You can link it manually.`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
        setIsSubmitting(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });

      toast({
        title: mode === "draft" ? "Saved as Draft Job" : "Accepted & Scheduled",
        description: mode === "draft" ? "Quote accepted. Job saved as draft." : "Quote accepted. Job added to your calendar.",
      });

      onSuccess(newJob.id);
    } catch {
      toast({
        title: "Something went wrong",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-[2rem] mx-4 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Accept Quote</DialogTitle>
        </DialogHeader>

        {/* Quote total strip */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 flex items-center gap-3 border border-green-100 dark:border-green-800/40">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Accepting quote</p>
            <p className="text-xs text-muted-foreground">Total: ${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-1 bg-muted rounded-xl p-1">
          {(["schedule", "draft", "link"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-bold transition-all ${mode === m ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "schedule" && <><Calendar className="w-3.5 h-3.5" />Schedule</>}
              {m === "draft" && <><FileText className="w-3.5 h-3.5" />Save Draft</>}
              {m === "link" && <><LinkIcon className="w-3.5 h-3.5" />Link Job</>}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-1">
          {mode === "link" ? (
            <div className="space-y-1.5">
              <Label>Link to Existing Job</Label>
              <Select value={linkJobId} onValueChange={setLinkJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {(jobs || []).filter(j => j.status !== "completed" && j.status !== "cancelled").map(j => (
                    <SelectItem key={j.id} value={j.id.toString()}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              {/* Job Title */}
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bathroom renovation"
                  data-testid="input-schedule-title"
                />
              </div>

              {/* Customer */}
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="select-schedule-customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time — only shown in schedule mode */}
              {mode === "schedule" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      min={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      data-testid="input-schedule-date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      data-testid="input-schedule-time"
                    />
                  </div>
                </div>
              )}

              {/* Duration */}
              <div className="space-y-1.5">
                <Label>Estimated Duration <span className="text-muted-foreground font-normal">(hours)</span></Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2"
                  data-testid="input-schedule-duration"
                />
              </div>

              {/* Job Site Address */}
              <div className="space-y-1.5">
                <Label>Job Site Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 12 Main St, Suburb"
                  data-testid="input-schedule-address"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Job details, access instructions, etc."
                  className="min-h-[72px] resize-none rounded-xl bg-[#F8F7F5] dark:bg-white/5 border-0"
                  data-testid="input-schedule-notes"
                />
              </div>
            </>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (mode === "link" ? !linkJobId : (!title.trim() || !customerId))}
          className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white mt-2"
          data-testid="button-confirm-schedule"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processing...</>
          ) : mode === "schedule" ? (
            <><Calendar className="w-5 h-5 mr-2" />Confirm & Schedule</>
          ) : mode === "draft" ? (
            <><FileText className="w-5 h-5 mr-2" />Save Draft Job</>
          ) : (
            <><LinkIcon className="w-5 h-5 mr-2" />Link to Job</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
