import { Header } from "@/components/Header";
import { useJob, useUpdateJob } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import { Loader2, Calendar, User, MapPin, Phone, Briefcase, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { RunningLateModal } from "@/components/RunningLateModal";

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const id = parseInt(params?.id || "0");
  const { data: job, isLoading } = useJob(id);
  const { data: customers } = useCustomers();
  const { mutate: updateJob, isPending: isUpdating } = useUpdateJob();
  const [showLateModal, setShowLateModal] = useState(false);

  const customer = customers?.find(c => c.id === job?.customerId);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!job) return <div className="p-8 text-center">Job not found</div>;

  const handleStatusChange = (status: string) => {
    updateJob({ id: job.id, status });
  };

  return (
    <div className="space-y-6">
      <Header title="Job Details" showBack />
      
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
          <span className={cn("px-3 py-1 rounded-full text-sm font-semibold capitalize", 
            job.status === 'completed' ? 'bg-green-100 text-green-700' : 
            job.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          )}>
            {job.status}
          </span>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled For</p>
              <p className="font-semibold text-lg">
                {job.scheduledDate ? format(new Date(job.scheduledDate), "EEEE, MMM d, yyyy") : "Unscheduled"}
              </p>
              <p className="text-muted-foreground">
                {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : ""}
              </p>
            </div>
          </div>

          {customer && (
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-accent/10 rounded-xl text-accent mt-0.5">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-semibold text-lg">{customer.name}</p>
                {customer.phone && (
                  <div className="flex items-center text-sm text-foreground/80">
                    <Phone className="w-3.5 h-3.5 mr-2" /> {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center text-sm text-foreground/80">
                    <MapPin className="w-3.5 h-3.5 mr-2" /> {customer.address}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{job.description || "No description."}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          className="h-14 rounded-xl border-2 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
          onClick={() => handleStatusChange("completed")}
          disabled={isUpdating || job.status === "completed"}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Mark Complete
        </Button>
        <Button 
          variant="outline" 
          className="h-14 rounded-xl border-2 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          onClick={() => handleStatusChange("cancelled")}
          disabled={isUpdating || job.status === "cancelled"}
        >
          <XCircle className="w-5 h-5 mr-2" />
          Cancel Job
        </Button>
      </div>

      {job.status === "scheduled" && (
        <Button
          onClick={() => setShowLateModal(true)}
          variant="outline"
          className="w-full h-14 rounded-xl border-2 border-orange-200 bg-[#FFF1EB] text-primary font-bold text-lg hover:bg-[#FFE5D9] hover:border-orange-300"
          data-testid="button-running-late"
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          Running Late
        </Button>
      )}

      <div className="mt-2">
         <Button className="w-full h-14 rounded-xl text-lg font-semibold bg-primary" asChild>
           <Link href={`/quotes/new?jobId=${job.id}`}>Create Quote for Job</Link>
         </Button>
      </div>

      <RunningLateModal
        open={showLateModal}
        onOpenChange={setShowLateModal}
        job={job}
      />
    </div>
  );
}
