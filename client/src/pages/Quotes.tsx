import { Header } from "@/components/Header";
import { useQuotes, useCreateQuote } from "@/hooks/use-quotes";
import { useState } from "react";
import { Plus, FileText, Loader2, Sparkles, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Quotes() {
  const { data: quotes, isLoading } = useQuotes();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Header 
        title="Quotes" 
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="sm" 
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Create
          </Button>
        } 
      />

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : quotes?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No quotes created.</p>
          </div>
        ) : (
          quotes?.sort((a,b) => (b.createdAt && a.createdAt ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : 0))
            .map(quote => (
            <div 
              key={quote.id} 
              onClick={() => setLocation(`/quotes/${quote.id}`)}
              className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:border-primary/50 transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">Quote #{quote.id}</h3>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize", 
                  quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  quote.status === 'draft' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                )}>
                  {quote.status}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-[70%]">
                  {quote.content || "No details added yet."}
                </p>
                <span className="font-bold text-lg text-primary">
                  ${Number(quote.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateQuoteDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

function CreateQuoteDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useCreateQuote();
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      totalAmount: amount || "0",
      content: desc,
      status: "draft"
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
             <Label>Description</Label>
             <Input 
               placeholder="Brief description" 
               value={desc}
               onChange={e => setDesc(e.target.value)}
               className="rounded-xl"
             />
          </div>
          <div className="space-y-2">
            <Label>Estimated Amount ($)</Label>
            <Input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-xl font-mono"
            />
          </div>
          
          <div className="bg-accent/10 p-4 rounded-xl flex items-start gap-3 mt-4">
            <Sparkles className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-accent-foreground">Need help writing?</p>
              <p className="text-muted-foreground">You can use the AI assistant to draft detailed line items after creating the quote.</p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
