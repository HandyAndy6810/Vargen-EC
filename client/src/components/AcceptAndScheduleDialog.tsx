import { useState } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/use-customers";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initialTitle);
  const [customerId, setCustomerId] = useState<string>(
    initialCustomerId?.toString() ?? ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState(initialSummary);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form fields when dialog opens with fresh props
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle(initialTitle);
      setCustomerId(initialCustomerId?.toString() ?? "");
      setScheduledDate(format(new Date(), "yyyy-MM-dd"));
      setTime("09:00");
      setNotes(initialSummary);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !customerId) return;
    setIsSubmitting(true);

    try {
      // Step 1: Create the job
      const jobRes = await fetch(api.jobs.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          customerId: parseInt(customerId),
          description: notes.trim() || undefined,
          scheduledDate: new Date(`${scheduledDate}T${time}`).toISOString(),
          status: "scheduled",
        }),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        toast({
          title: "Scheduling failed",
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
          description: `Job #${newJob.id} was created and is on your calendar, but the quote link failed. You can link it manually.`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
        setIsSubmitting(false);
        return;
      }

      // Both succeeded
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.quotes.list.path] });

      toast({
        title: "Accepted & Scheduled",
        description: "Quote accepted. Job added to your calendar.",
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
          <DialogTitle className="text-lg font-bold">Accept & Schedule</DialogTitle>
        </DialogHeader>

        {/* Quote total strip */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 flex items-center gap-3 border border-green-100 dark:border-green-800/40">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Accepting quote</p>
            <p className="text-xs text-muted-foreground">
              Total: ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
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

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={scheduledDate}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Job details, access instructions, etc."
              className="min-h-[72px] resize-none rounded-xl bg-[#F8F7F5] dark:bg-white/5 border-0"
              data-testid="input-schedule-notes"
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !customerId}
          className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white mt-2"
          data-testid="button-confirm-schedule"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Scheduling...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5 mr-2" />
              Confirm & Schedule
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
