import { Header } from "@/components/Header";
import { useJobs, useCreateJob } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState } from "react";
import { Plus, Briefcase, Calendar, MapPin, User, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Header 
        title="Jobs" 
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="sm" 
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> New Job
          </Button>
        } 
      />

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : jobs?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No scheduled jobs.</p>
          </div>
        ) : (
          jobs?.sort((a,b) => (a.scheduledDate && b.scheduledDate ? new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime() : 0))
            .map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:border-primary/50 transition-all active:scale-[0.99] cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{job.title}</h3>
                  <Badge status={job.status || "scheduled"} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 text-accent" />
                    {job.scheduledDate ? format(new Date(job.scheduledDate), "MMM d, yyyy 'at' h:mm a") : "Unscheduled"}
                  </div>
                  {job.customerId && <CustomerName id={job.customerId} />}
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 pl-6 border-l-2 border-border">
                    {job.description || "No description provided."}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <CreateJobDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize", styles[status as keyof typeof styles] || styles.scheduled)}>
      {status}
    </span>
  );
}

function CustomerName({ id }: { id: number }) {
  const { data: customer } = useCustomers();
  const c = customer?.find(c => c.id === id);
  if (!c) return null;
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <User className="w-4 h-4 mr-2" />
      {c.name}
    </div>
  );
}

function CreateJobDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useCreateJob();
  const { data: customers } = useCustomers();
  const [formData, setFormData] = useState({ title: "", description: "", customerId: "", scheduledDate: "", time: "" });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time
    let scheduledDate: Date | undefined;
    if (formData.scheduledDate) {
      scheduledDate = new Date(`${formData.scheduledDate}T${formData.time || "09:00"}`);
    }

    mutate({
      title: formData.title,
      description: formData.description,
      customerId: formData.customerId ? parseInt(formData.customerId) : undefined,
      scheduledDate: scheduledDate,
      status: "scheduled"
    }, {
      onSuccess: () => {
        setFormData({ title: "", description: "", customerId: "", scheduledDate: "", time: "" });
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input 
              id="title" 
              required
              placeholder="e.g. Fix leaky faucet"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select 
              value={formData.customerId} 
              onValueChange={v => setFormData({...formData, customerId: v})}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date"
                value={formData.scheduledDate}
                onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input 
                id="time" 
                type="time"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea 
              id="desc" 
              placeholder="Job details..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
