import { useState } from "react";
import { useLocation } from "wouter";
import { useCustomers } from "@/hooks/use-customers";
import { useCreateQuote } from "@/hooks/use-quotes";
import { SuccessFlash } from "@/components/SuccessFlash";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QuickQuoteSheet({ open, onOpenChange }: Props) {
  const [, setLocation] = useLocation();
  const { data: customers } = useCustomers();
  const { mutate: createQuote, isPending } = useCreateQuote();

  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [newQuoteId, setNewQuoteId] = useState<number | null>(null);

  const canSubmit = customerId && customerId !== "__new__" && title.trim();

  const handleCreate = () => {
    if (!canSubmit) return;
    const amount = price && Number(price) > 0 ? Number(price) : 0;
    const content = JSON.stringify({
      jobTitle: title.trim(),
      items: amount > 0 ? [{ description: title.trim(), quantity: 1, unitPrice: amount }] : [],
      subtotal: amount,
      gstAmount: 0,
      totalAmount: amount,
      includeGST: false,
    });

    createQuote(
      {
        customerId: Number(customerId),
        content,
        status: "draft",
        totalAmount: String(amount),
      },
      {
        onSuccess: (created: any) => {
          setNewQuoteId(created.id);
          setShowFlash(true);
        },
      }
    );
  };

  const handleFlashDone = () => {
    setShowFlash(false);
    reset();
    onOpenChange(false);
    if (newQuoteId) setLocation(`/quotes/${newQuoteId}`);
  };

  const reset = () => {
    setCustomerId("");
    setTitle("");
    setPrice("");
    setNewQuoteId(null);
  };

  return (
    <>
      <SuccessFlash show={showFlash} message="Quote Created!" onDone={handleFlashDone} duration={1200} />

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="sm:max-w-sm rounded-[2rem] p-7">
            <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold">Quick Quote</h2>
          </div>

          <div className="space-y-4">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</Label>
              <Select
                value={customerId}
                onValueChange={v => {
                  if (v === "__new__") {
                    reset();
                    onOpenChange(false);
                    setLocation("/quotes/new");
                    return;
                  }
                  setCustomerId(v);
                }}
              >
                <SelectTrigger className="h-12 rounded-xl border-black/10 dark:border-white/10" data-testid="qq-customer">
                  <SelectValue placeholder="Who's this for?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ New Customer</SelectItem>
                  {(customers || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Job Description</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Fix leaky tap"
                className="h-12 rounded-xl border-black/10 dark:border-white/10"
                data-testid="qq-title"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price estimate (optional)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  className="h-12 rounded-xl pl-7 border-black/10 dark:border-white/10 font-bold text-lg"
                  data-testid="qq-price"
                />
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleCreate}
              disabled={!canSubmit || isPending}
              className={cn(
                "w-full h-14 rounded-2xl text-base font-bold transition-all mt-1",
                canSubmit
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground"
              )}
              data-testid="qq-submit"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              Create Draft Quote
            </Button>

            {/* Full builder escape */}
            <Button
              variant="outline"
              onClick={() => { reset(); onOpenChange(false); setLocation("/quotes/new"); }}
              className="w-full h-12 rounded-2xl border-primary text-primary font-bold hover:bg-primary/5"
              data-testid="qq-full-builder"
            >
              Use Full Quote Builder →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
