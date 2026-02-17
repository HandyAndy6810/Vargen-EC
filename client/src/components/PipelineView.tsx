import { Quote } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "wouter";

interface PipelineViewProps {
  quotes: Quote[];
}

export function PipelineView({ quotes }: PipelineViewProps) {
  const statuses = ["draft", "sent", "accepted", "rejected"] as const;
  
  const getQuotesByStatus = (status: string) => 
    quotes.filter(q => q.status === status);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold px-1">Quote Pipeline</h3>
      <ScrollArea className="w-full whitespace-nowrap rounded-[2rem] border border-black/5 bg-white dark:bg-white/5 shadow-sm">
        <div className="flex w-max p-4 gap-4">
          {statuses.map((status) => {
            const statusQuotes = getQuotesByStatus(status);
            return (
              <div key={status} className="w-64 flex flex-col gap-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="font-bold capitalize text-sm">{status}</h4>
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                    {statusQuotes.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {statusQuotes.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-center">
                      <p className="text-[10px] text-muted-foreground italic">No quotes</p>
                    </div>
                  ) : (
                    statusQuotes.map((quote) => (
                      <Link key={quote.id} href={`/quotes/${quote.id}`}>
                        <Card className="rounded-xl border-black/5 dark:border-white/10 shadow-none hover-elevate cursor-pointer overflow-hidden whitespace-normal">
                          <CardHeader className="p-3 pb-1">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-xs font-bold line-clamp-1">
                                {JSON.parse(quote.content || "{}").jobTitle || "Untitled Quote"}
                              </CardTitle>
                              <span className="text-[10px] font-bold shrink-0">
                                ${Number(quote.totalAmount).toLocaleString()}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {JSON.parse(quote.content || "{}").summary}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
