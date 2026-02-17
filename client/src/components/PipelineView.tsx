import { Quote } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface PipelineViewProps {
  quotes: Quote[];
}

export function PipelineView({ quotes }: PipelineViewProps) {
  const statuses = [
    { id: "draft", label: "Drafts", color: "bg-slate-500" },
    { id: "sent", label: "Sent", color: "bg-blue-500" },
    { id: "accepted", label: "Accepted", color: "bg-emerald-500" },
    { id: "rejected", label: "Rejected", color: "bg-rose-500" },
  ] as const;
  
  const getQuotesByStatus = (status: string) => 
    quotes.filter(q => q.status === status);

  const totalValue = quotes.reduce((acc, q) => acc + Number(q.totalAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <h3 className="text-xl font-bold">Quote Pipeline</h3>
        <p className="text-sm font-bold text-muted-foreground">
          Total: ${totalValue.toLocaleString()}
        </p>
      </div>

      <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10">
        {/* Progress Bar Style Analytics */}
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-black/5 dark:bg-white/5 mb-8">
          {statuses.map((status) => {
            const statusQuotes = getQuotesByStatus(status.id);
            const percentage = quotes.length > 0 ? (statusQuotes.length / quotes.length) * 100 : 0;
            if (percentage === 0) return null;
            return (
              <div 
                key={status.id}
                style={{ width: `${percentage}%` }}
                className={cn("h-full transition-all", status.color)}
              />
            );
          })}
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          {statuses.map((status) => {
            const statusQuotes = getQuotesByStatus(status.id);
            const value = statusQuotes.reduce((acc, q) => acc + Number(q.totalAmount), 0);
            
            return (
              <Link key={status.id} href="/quotes">
                <div className="space-y-1 active:scale-95 transition-transform cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", status.color)} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black">{statusQuotes.length}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      ${value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
