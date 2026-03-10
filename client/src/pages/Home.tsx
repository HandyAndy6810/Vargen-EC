import { useJobs } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PipelineView } from "@/components/PipelineView";
import { 
  Plus, 
  ChevronRight, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Users, 
  Settings,
  Clock,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addDays
} from "date-fns";

export default function Home() {
  const { user } = useAuth();
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const quickStarts = (() => {
    if (!quotes || quotes.length === 0) {
      return [
        { label: "Bathroom Reno", icon: "🚿" },
        { label: "Decking", icon: "🪵" },
        { label: "Switchboard", icon: "⚡" },
      ];
    }

    // Extract job titles from recent quotes and count occurrences
    const counts: Record<string, number> = {};
    quotes.forEach(q => {
      try {
        const title = JSON.parse(q.content || "{}").jobTitle;
        if (title) counts[title] = (counts[title] || 0) + 1;
      } catch (e) {}
    });

    // Get top 3 unique titles, but generalized
    const suggestions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => {
        // Generalize common labels
        let cleanLabel = label;
        if (label.toLowerCase().includes("bathroom")) cleanLabel = "Bathroom Reno";
        if (label.toLowerCase().includes("deck")) cleanLabel = "Decking Job";
        if (label.toLowerCase().includes("switchboard")) cleanLabel = "Switchboard Upgrade";
        if (label.toLowerCase().includes("lighting") || label.toLowerCase().includes("downlight")) cleanLabel = "Lighting Install";
        if (label.toLowerCase().includes("faucet") || label.toLowerCase().includes("leak")) cleanLabel = "Plumbing Repair";
        
        return cleanLabel;
      });

    const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 3);

    return uniqueSuggestions.map(label => ({
      label,
      icon: label.toLowerCase().includes("bath") ? "🚿" : 
            label.toLowerCase().includes("deck") ? "🪵" : 
            label.toLowerCase().includes("switch") ? "⚡" : 
            label.toLowerCase().includes("light") ? "💡" :
            label.toLowerCase().includes("plumb") ? "🚰" : "📋"
    }));
  })();
  
  const [bladeOrder, setBladeOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("vargenezey_home_blade_order");
    return saved ? JSON.parse(saved) : ["hero", "stats", "pipeline", "actions", "calendar"];
  });

  // Listen for storage changes to update home page layout
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("vargenezey_home_blade_order");
      if (saved) setBladeOrder(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const pendingQuotesCount = quotes?.filter(q => q.status === 'draft').length || 0;
  const upcomingJobsCount = jobs?.filter(j => j.status === 'scheduled').length || 0;

  // Weekly calendar logic
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selectedDateJobs = jobs?.filter(job => 
    job.scheduledDate && isSameDay(new Date(job.scheduledDate), selectedDate)
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Header */}
      <div className="flex justify-between items-center px-6 pt-12 mb-8">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-lg">Ready to grow your business?</p>
        </div>
        <Link href="/profile">
          <button className="absolute right-6 top-12 p-2 hover:bg-black/5 rounded-full transition-colors" data-testid="button-home-settings">
            <Settings className="w-6 h-6 text-foreground/60" />
          </button>
        </Link>
      </div>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        {bladeOrder.map((bladeId) => {
          if (bladeId === "hero") {
            return (
              <div key="hero" className="header-card py-6 px-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1 text-white">AI-Powered Quoting</h2>
                    <p className="text-white/70 mb-4 text-sm">
                      Create professional quotes in seconds with AI
                    </p>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Quick Start</p>
                      <div className="flex flex-wrap gap-2">
                        {quickStarts.map((start) => (
                          <Link 
                            key={start.label} 
                            href={`/quotes/new?template=${encodeURIComponent(start.label)}&autoStart=true`}
                          >
                            <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 transition-all text-left group active:scale-95">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{start.icon}</span>
                                <span className="text-xs font-bold text-white/90 group-hover:text-white transition-colors">{start.label}</span>
                              </div>
                            </button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link href="/quotes/new">
                    <button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/20 text-sm h-fit">
                      Create Quote
                      <Plus className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          }

          if (bladeId === "stats") {
            return (
              <div key="stats" className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card rounded-[2rem] p-8 text-center shadow-sm border border-black/5">
                  <div className="text-4xl font-bold mb-1">{pendingQuotesCount}</div>
                  <div className="text-muted-foreground font-medium">Pending Quotes</div>
                </div>
                <div className="bg-white dark:bg-card rounded-[2rem] p-8 text-center shadow-sm border border-black/5">
                  <div className="text-4xl font-bold mb-1">{upcomingJobsCount}</div>
                  <div className="text-muted-foreground font-medium">Upcoming Jobs</div>
                </div>
              </div>
            );
          }

          if (bladeId === "pipeline") {
            return (
              <PipelineView key="pipeline" quotes={quotes || []} />
            );
          }

          if (bladeId === "actions") {
            return (
              <div key="actions" className="space-y-4">
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
                      <CalendarIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">Schedule</div>
                      <div className="text-muted-foreground text-sm">Manage your jobs</div>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          }

          if (bladeId === "calendar") {
            return (
              <div key="calendar" className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xl font-bold">This Week</h3>
                  <Link href="/jobs" className="text-sm font-semibold text-primary">View Calendar</Link>
                </div>
                
                <div className="bg-white dark:bg-card rounded-[2rem] p-4 shadow-sm border border-black/5">
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day, idx) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const hasJobs = jobs?.some(job => job.scheduledDate && isSameDay(new Date(job.scheduledDate), day));

                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-2xl cursor-pointer transition-all active:scale-95",
                            isSelected ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-black/5"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-bold uppercase mb-1",
                            isSelected ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {format(day, "eee")}
                          </span>
                          <span className="text-sm font-bold">{format(day, "d")}</span>
                          {hasJobs && (
                            <div className={cn(
                              "w-1 h-1 rounded-full mt-1",
                              isSelected ? "bg-white" : "bg-primary"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Day Agenda */}
                  <div className="mt-4 pt-4 border-t border-black/5 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase px-1">
                      {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, "EEEE")}
                    </p>
                    
                    {selectedDateJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-1 py-2 italic">No jobs scheduled</p>
                    ) : (
                      selectedDateJobs.slice(0, 3).map(job => (
                        <Link key={job.id} href={`/jobs/${job.id}`}>
                          <div className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-xl transition-colors cursor-pointer active:scale-[0.98]">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{job.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : "TBD"}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                          </div>
                        </Link>
                      ))
                    )}
                    {selectedDateJobs.length > 3 && (
                      <Link href="/jobs" className="block text-center text-xs font-bold text-primary py-1">
                        + {selectedDateJobs.length - 3} more jobs
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
