import { useJobs } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Plus, 
  ChevronRight, 
  MessageSquare, 
  Calendar, 
  Users, 
  Settings,
  Home as HomeIcon,
  FileText,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user } = useAuth();
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();

  const pendingQuotesCount = quotes?.filter(q => q.status === 'draft').length || 0;
  const upcomingJobsCount = jobs?.filter(j => j.status === 'scheduled').length || 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Header */}
      <div className="flex justify-between items-center px-6 pt-12 mb-8">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-lg">Ready to grow your business?</p>
        </div>
        <button className="absolute right-6 top-12 p-2 hover:bg-black/5 rounded-full transition-colors">
          <Settings className="w-6 h-6 text-foreground/60" />
        </button>
      </div>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        {/* AI Quoting Hero */}
        <div className="header-card">
          <h2 className="text-2xl font-bold mb-3">AI-Powered Quoting</h2>
          <p className="text-white/80 mb-8 text-lg">
            Create professional quotes in seconds with our intelligent assistant
          </p>
          <Link href="/quotes/new">
            <button className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20">
              Create Quote
              <Plus className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-black/5">
            <div className="text-4xl font-bold mb-1">{pendingQuotesCount}</div>
            <div className="text-muted-foreground font-medium">Pending Quotes</div>
          </div>
          <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-black/5">
            <div className="text-4xl font-bold mb-1">{upcomingJobsCount}</div>
            <div className="text-muted-foreground font-medium">Upcoming Jobs</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold px-1 mb-4">Quick Actions</h3>
          
          <Link href="/quotes/new" className="action-tile group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">New Quote</div>
                <div className="text-muted-foreground text-sm">Create with AI assistance</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/messages" className="action-tile group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">Messages</div>
                <div className="text-muted-foreground text-sm">Chat with clients</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/jobs" className="action-tile group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">Schedule</div>
                <div className="text-muted-foreground text-sm">Manage your jobs</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/subcontractors" className="action-tile group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">Subcontractors</div>
                <div className="text-muted-foreground text-sm">Manage your team</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

    </div>
  );
}
