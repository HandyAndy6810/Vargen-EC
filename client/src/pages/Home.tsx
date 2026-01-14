import { Header } from "@/components/Header";
import { useJobs } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Calendar, FileText, Plus, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();

  // Filter for upcoming jobs (today/future)
  const upcomingJobs = jobs?.filter(job => job.status === 'scheduled')
    .sort((a, b) => (a.scheduledDate && b.scheduledDate ? new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime() : 0))
    .slice(0, 3);

  // Filter for draft quotes
  const draftQuotes = quotes?.filter(quote => quote.status === 'draft').slice(0, 3);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      <Header />
      
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {greeting()}, {user?.firstName}.
        </h2>
        <p className="text-muted-foreground">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="col-span-full grid grid-cols-2 gap-4">
          <Link href="/jobs" className="group relative overflow-hidden bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calendar className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">New Job</h3>
              <p className="text-primary-foreground/80 text-sm">Schedule a visit</p>
            </div>
          </Link>

          <Link href="/quotes" className="group relative overflow-hidden bg-card border border-border hover:border-accent/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-foreground">
              <FileText className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="bg-accent/10 w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-accent">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">New Quote</h3>
              <p className="text-muted-foreground text-sm">Create an estimate</p>
            </div>
          </Link>
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Upcoming Jobs
            </h3>
            <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">View All</Link>
          </div>
          
          <div className="divide-y divide-border">
            {jobsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading schedule...</div>
            ) : upcomingJobs?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 mb-2 text-muted-foreground/30" />
                <p>No upcoming jobs.</p>
                <p className="text-sm">Enjoy your time off!</p>
              </div>
            ) : (
              upcomingJobs?.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-foreground">{job.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {job.scheduledDate ? format(new Date(job.scheduledDate), "MMM d, h:mm a") : "Unscheduled"}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Draft Quotes */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Draft Quotes
            </h3>
            <Link href="/quotes" className="text-sm font-semibold text-primary hover:underline">View All</Link>
          </div>
          
          <div className="divide-y divide-border">
            {quotesLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading quotes...</div>
            ) : draftQuotes?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <FileText className="w-12 h-12 mb-2 text-muted-foreground/30" />
                <p>No draft quotes.</p>
              </div>
            ) : (
              draftQuotes?.map(quote => (
                <Link key={quote.id} href={`/quotes/${quote.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-foreground">Quote #{quote.id}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{quote.content || "No description"}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground block">
                        ${Number(quote.totalAmount).toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        Draft
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
