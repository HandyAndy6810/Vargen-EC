import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WIDGET_DEFS, useWidgetConfig, type WidgetId } from "@/hooks/use-widget-config";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: Record<WidgetId, boolean>;
  toggle: (id: WidgetId) => void;
}

export function WidgetCustomiseSheet({ open, onOpenChange, config, toggle }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-[2rem] p-7">
        <DialogHeader className="mb-5">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <LayoutGrid className="w-4 h-4 text-foreground" />
            </div>
            Customise Home
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {WIDGET_DEFS.map((widget) => {
            const on = config[widget.id] ?? widget.defaultOn;
            return (
              <button
                key={widget.id}
                onClick={() => toggle(widget.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                  on
                    ? "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30"
                    : "bg-white dark:bg-white/5 border-black/5 dark:border-white/10"
                )}
              >
                {/* Toggle */}
                <div className={cn(
                  "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0",
                  on ? "bg-primary" : "bg-black/20 dark:bg-white/20"
                )}>
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white shadow transition-transform",
                    on ? "translate-x-5" : "translate-x-0"
                  )} />
                </div>

                {/* Label */}
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-bold", on ? "text-foreground" : "text-muted-foreground")}>
                    {widget.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{widget.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Changes save automatically
        </p>
      </DialogContent>
    </Dialog>
  );
}
