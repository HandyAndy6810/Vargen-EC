import { useState } from "react";
import { useLocation } from "wouter";
import { useCustomers } from "@/hooks/use-customers";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useUserSettings } from "@/hooks/use-user-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewInvoiceSheet({ open, onOpenChange }: Props) {
  const [, setLocation] = useLocation();
  const { data: customers } = useCustomers();
  const { data: settings } = useUserSettings();
  const { mutate: createInvoice, isPending } = useCreateInvoice();

  const paymentDays = Number(settings?.paymentTermsDays ?? 14);
  const defaultDueDate = format(addDays(new Date(), paymentDays), "yyyy-MM-dd");

  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [includeGST, setIncludeGST] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const reset = () => {
    setCustomerId("");
    setDueDate(defaultDueDate);
    setIncludeGST(false);
    setNotes("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
  };

  const addItem = () =>
    setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const gstAmount = includeGST ? +(subtotal * 0.1).toFixed(2) : 0;
  const total = subtotal + gstAmount;

  const canSubmit =
    customerId &&
    items.length > 0 &&
    items.every(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0);

  const handleCreate = () => {
    if (!canSubmit) return;
    createInvoice(
      {
        customerId: Number(customerId),
        items,
        dueDate,
        notes: notes.trim() || undefined,
        includeGST,
      },
      {
        onSuccess: (invoice) => {
          reset();
          onOpenChange(false);
          setLocation(`/invoices/${invoice.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="rounded-[2rem] max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            New Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customers || []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</Label>
            {items.map((item, i) => (
              <div key={i} className="space-y-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                    placeholder="Description"
                    className="rounded-xl flex-1"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="p-1.5 text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={e => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="rounded-xl h-10"
                    />
                  </div>
                </div>
                {item.quantity > 0 && item.unitPrice > 0 && (
                  <p className="text-xs text-right text-muted-foreground font-medium">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full h-10 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-primary/60 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* GST Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Include GST (10%)</p>
              <p className="text-xs text-muted-foreground">Adds 10% to the subtotal</p>
            </div>
            <button
              onClick={() => setIncludeGST(v => !v)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                includeGST ? "bg-primary" : "bg-black/20 dark:bg-white/20"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                includeGST ? "left-[26px]" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Totals */}
          <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {includeGST && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (10%)</span>
                <span className="font-medium">${gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-black/5 dark:border-white/10">
              <span>Total</span>
              <span className="text-primary text-lg">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notes <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment instructions, job details…"
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleCreate}
            disabled={!canSubmit || isPending}
            className={cn(
              "w-full h-14 rounded-2xl text-base font-bold",
              canSubmit ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {isPending ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating…</> : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
