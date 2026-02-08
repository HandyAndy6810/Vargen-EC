import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, AlertTriangle, Send, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateJob } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes } from "date-fns";
import type { Job } from "@shared/schema";

interface RunningLateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

const DELAY_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hours", minutes: 120 },
];

const REASON_OPTIONS = [
  "Previous job ran over",
  "Traffic",
  "Waiting on parts",
  "Emergency call-out",
  "Other",
];

export function RunningLateModal({ open, onOpenChange, job }: RunningLateModalProps) {
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { mutate: updateJob, isPending } = useUpdateJob();
  const { data: customers } = useCustomers();
  const { toast } = useToast();

  const customer = customers?.find(c => c.id === job.customerId);
  const newEta = job.scheduledDate && selectedDelay
    ? addMinutes(new Date(job.scheduledDate), selectedDelay)
    : null;

  const generatedMessage = selectedDelay
    ? `Hi${customer?.name ? ` ${customer.name.split(' ')[0]}` : ''}, just letting you know I'm running about ${selectedDelay} minutes late${selectedReason ? ` — ${selectedReason.toLowerCase()}` : ''}. New arrival time is around ${newEta ? format(newEta, "h:mm a") : 'TBD'}. Sorry for the inconvenience.`
    : "";

  const handleSend = () => {
    if (!selectedDelay) return;

    updateJob({
      id: job.id,
      scheduledDate: newEta || undefined,
    }, {
      onSuccess: () => {
        setSent(true);
        toast({
          title: "Client notified",
          description: `${customer?.name || 'Client'} has been notified of the delay.`,
        });
        setTimeout(() => {
          setSent(false);
          setSelectedDelay(null);
          setSelectedReason("");
          setCustomMessage("");
          onOpenChange(false);
        }, 1500);
      }
    });
  };

  const handleClose = () => {
    setSelectedDelay(null);
    setSelectedReason("");
    setCustomMessage("");
    setSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-[#3D3025] p-8 pb-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Running Late</DialogTitle>
                <p className="text-white/60 text-sm">{job.title}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Delay Selector */}
          <div className="space-y-3">
            <label className="font-bold text-[#1A1A1A] text-base">How late?</label>
            <div className="grid grid-cols-3 gap-2">
              {DELAY_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setSelectedDelay(opt.minutes)}
                  className={cn(
                    "py-4 rounded-2xl font-bold text-base transition-all active:scale-95",
                    selectedDelay === opt.minutes
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-[#F5F3F0] text-[#1A1A1A] hover:bg-[#EEEBE7]"
                  )}
                  data-testid={`delay-${opt.minutes}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Picker */}
          <div className="space-y-3">
            <label className="font-bold text-[#1A1A1A] text-base">Quick reason <span className="font-normal text-[#999999] text-sm">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(selectedReason === reason ? "" : reason)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95",
                    selectedReason === reason
                      ? "bg-[#FFF1EB] text-primary border-2 border-primary"
                      : "bg-[#F5F3F0] text-[#666666] border-2 border-transparent"
                  )}
                  data-testid={`reason-${reason.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview */}
          {selectedDelay && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-[#1A1A1A] text-base">Message to client</label>
                {customer && (
                  <span className="text-xs font-medium text-[#8B7E74] bg-[#F0EEEB] px-2 py-1 rounded-lg">
                    {customer.name}
                  </span>
                )}
              </div>
              <div className="bg-[#FAFAFA] border border-black/5 rounded-2xl p-4">
                <p className="text-sm text-[#333333] leading-relaxed">
                  {customMessage || generatedMessage}
                </p>
              </div>
              <Textarea
                placeholder="Or type a custom message..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                className="rounded-2xl border-black/10 min-h-[60px] text-sm"
                data-testid="custom-message"
              />
            </div>
          )}

          {/* New ETA */}
          {newEta && (
            <div className="bg-[#FFF1EB] rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">New arrival time</p>
                <p className="text-lg font-bold text-primary">{format(newEta, "h:mm a")}</p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!selectedDelay || isPending || sent}
            className={cn(
              "w-full h-16 rounded-2xl text-lg font-bold shadow-lg transition-all",
              sent 
                ? "bg-green-500 hover:bg-green-500 text-white" 
                : "bg-primary text-white shadow-primary/20"
            )}
            data-testid="button-send-late-notification"
          >
            {sent ? (
              <>
                <Check className="w-6 h-6 mr-2" /> Sent
              </>
            ) : isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" /> Notify Client
              </>
            )}
          </Button>

          {!customer && selectedDelay && (
            <p className="text-center text-xs text-[#999999]">
              No client linked to this job. The delay will still be recorded.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
