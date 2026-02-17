import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Phone, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowUpSheetProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone: string | null;
  jobDescription: string;
  amount: string;
  daysSinceSent: number;
  tradieName?: string;
}

type TemplateKey = "gentle" | "urgency" | "price";

const templates: { key: TemplateKey; label: string; icon: string }[] = [
  { key: "gentle", label: "Gentle Check-in", icon: "wave" },
  { key: "urgency", label: "Availability Urgency", icon: "calendar" },
  { key: "price", label: "Sharpened Price", icon: "dollar" },
];

function buildMessage(
  key: TemplateKey,
  clientName: string,
  jobDescription: string,
  amount: string,
  daysSinceSent: number,
  tradieName: string
): string {
  switch (key) {
    case "gentle":
      return `Hi ${clientName}, just checking you received my quote for ${jobDescription} ($${amount}). Happy to answer any questions or adjust anything. Cheers, ${tradieName}`;
    case "urgency":
      return `Hi ${clientName}, I sent a quote through ${daysSinceSent} days ago for ${jobDescription} and wanted to touch base. I've got a gap in my schedule coming up and thought it might line up well. Let me know if you'd like to go ahead!`;
    case "price":
      return `Hi ${clientName}, I've been able to sharpen my price a little on the ${jobDescription} quote. Happy to chat through it if that helps. Cheers, ${tradieName}`;
  }
}

export default function FollowUpSheet({
  open,
  onClose,
  clientName,
  clientPhone,
  jobDescription,
  amount,
  daysSinceSent,
  tradieName = "your tradie",
}: FollowUpSheetProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("gentle");
  const [message, setMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (open) {
      setSelectedTemplate("gentle");
      setMessage(buildMessage("gentle", clientName, jobDescription, amount, daysSinceSent, tradieName));
      setIsClosing(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, clientName, jobDescription, amount, daysSinceSent, tradieName]);

  const handleTemplateSelect = (key: TemplateKey) => {
    setSelectedTemplate(key);
    setMessage(buildMessage(key, clientName, jobDescription, amount, daysSinceSent, tradieName));
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current;
    if (diff > 100) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    startY.current = 0;
    currentY.current = 0;
  };

  const handleOpenMessages = () => {
    if (!clientPhone) return;
    const encoded = encodeURIComponent(message);
    window.location.href = `sms:${clientPhone}?body=${encoded}`;
  };

  const handleCallClient = () => {
    if (!clientPhone) return;
    window.location.href = `tel:${clientPhone}`;
  };

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        ref={backdropRef}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-250",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
        data-testid="follow-up-backdrop"
      />

      <div
        ref={sheetRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-250 ease-out",
          isClosing ? "translate-y-full" : "translate-y-0"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="follow-up-sheet"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4 pt-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">Follow Up</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                Sent {daysSinceSent} days ago to <span className="font-medium text-foreground">{clientName}</span>
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            data-testid="button-close-followup"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Choose a template</p>
          <div className="space-y-2 mb-5">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTemplateSelect(t.key)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3",
                  selectedTemplate === t.key
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border bg-white dark:bg-white/5"
                )}
                data-testid={`button-template-${t.key}`}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  selectedTemplate === t.key
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedTemplate === t.key && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  selectedTemplate === t.key ? "text-foreground" : "text-muted-foreground"
                )}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Message preview</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full min-h-[140px] p-4 rounded-xl border border-border bg-white dark:bg-white/5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            data-testid="textarea-followup-message"
          />

          {!clientPhone && (
            <p className="text-xs text-red-500 mt-2 font-medium">No phone number on file for this client.</p>
          )}
        </div>

        <div className="px-6 pb-8 pt-3 border-t border-border flex gap-3">
          <Button
            className="flex-1 gap-2 rounded-xl"
            onClick={handleOpenMessages}
            disabled={!clientPhone}
            data-testid="button-open-messages"
          >
            <MessageSquare className="w-4 h-4" />
            Open Messages
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl"
            onClick={handleCallClient}
            disabled={!clientPhone}
            data-testid="button-call-client"
          >
            <Phone className="w-4 h-4" />
            Call Client
          </Button>
        </div>
      </div>
    </div>
  );
}
