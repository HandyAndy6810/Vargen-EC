import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Sparkles,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  type: "quote_created" | "quote_accepted" | "quote_rejected" | "job_scheduled" | "job_completed";
  description: string;
  timestamp: string;
  entityId: number;
  entityType: "quote" | "job";
}

interface FrequentTemplate {
  label: string;
  icon: string;
  count: number;
}

interface SavedTemplate {
  id: number;
  userId: string;
  label: string;
  icon: string | null;
  description: string | null;
  createdAt: string;
}

const activityIcon = (type: ActivityEvent["type"]) => {
  switch (type) {
    case "quote_created": return <FileText className="w-4 h-4 text-blue-500" />;
    case "quote_accepted": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "quote_rejected": return <XCircle className="w-4 h-4 text-red-500" />;
    case "job_scheduled": return <Calendar className="w-4 h-4 text-orange-500" />;
    case "job_completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
};

const activityColor = (type: ActivityEvent["type"]) => {
  switch (type) {
    case "quote_created": return "bg-blue-50 dark:bg-blue-900/20";
    case "quote_accepted": return "bg-green-50 dark:bg-green-900/20";
    case "quote_rejected": return "bg-red-50 dark:bg-red-900/20";
    case "job_scheduled": return "bg-orange-50 dark:bg-orange-900/20";
    case "job_completed": return "bg-emerald-50 dark:bg-emerald-900/20";
  }
};

export function RecentActivityBlade() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  });

  const { data: frequentTemplates } = useQuery<FrequentTemplate[]>({
    queryKey: ["/api/templates/frequent"],
    queryFn: async () => {
      const res = await fetch("/api/templates/frequent", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch frequent templates");
      return res.json();
    },
  });

  const { data: savedTemplates } = useQuery<SavedTemplate[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: { label: string; icon: string; description?: string }) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to save template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template saved", description: "Added to your custom templates." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template removed", description: "Removed from your custom templates." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const savedLabels = new Set((savedTemplates || []).map(t => t.label));

  const allTemplates: Array<{ label: string; icon: string; savedId?: number; count?: number }> = [];

  (savedTemplates || []).forEach(t => {
    allTemplates.push({ label: t.label, icon: t.icon || "📋", savedId: t.id });
  });

  (frequentTemplates || []).forEach(t => {
    if (!savedLabels.has(t.label)) {
      allTemplates.push({ label: t.label, icon: t.icon, count: t.count });
    }
  });

  const hasActivity = activities && activities.length > 0;
  const hasTemplates = allTemplates.length > 0;

  return (
    <div className="space-y-4" data-testid="blade-activity">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-bold" data-testid="text-activity-title">Recent Activity</h3>
        <Clock className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="bg-white dark:bg-card rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
        {activitiesLoading ? (
          <div className="p-6 text-center">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasActivity ? (
          <div className="max-h-[280px] overflow-y-auto">
            {activities!.slice(0, 8).map((event, idx) => {
              const link = event.entityType === "quote"
                ? `/quotes/${event.entityId}`
                : `/jobs/${event.entityId}`;
              return (
                <Link key={`${event.entityType}-${event.entityId}-${idx}`} href={link}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border-b border-black/5 last:border-b-0 active:scale-[0.98]"
                    data-testid={`activity-item-${idx}`}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", activityColor(event.type))}>
                      {activityIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground" data-testid={`text-activity-desc-${idx}`}>
                        {event.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center" data-testid="text-no-activity">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create quotes and schedule jobs to see your activity here</p>
          </div>
        )}
      </div>

      {(hasTemplates || hasActivity) && (
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide" data-testid="text-templates-title">
                Quick Templates
              </h4>
            </div>
          </div>

          {hasTemplates ? (
            <div className="grid grid-cols-2 gap-3">
              {allTemplates.slice(0, 6).map((template) => {
                const menuKey = template.savedId ? `saved-${template.savedId}` : `freq-${template.label}`;
                const isMenuOpen = openMenuId === menuKey;

                return (
                  <div
                    key={menuKey}
                    className="relative group"
                    data-testid={`template-card-${template.label.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <Link
                      href={`/quotes/new?template=${encodeURIComponent(template.label)}&autoStart=true`}
                    >
                      <div className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm border border-black/5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer active:scale-[0.97]">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{template.icon}</span>
                          {template.savedId && (
                            <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-foreground truncate">{template.label}</p>
                        {template.count && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{template.count} past quotes</p>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : menuKey);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      data-testid={`button-template-menu-${template.label.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute top-10 right-2 bg-white dark:bg-card border border-black/10 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                        {template.savedId ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteTemplateMutation.mutate(template.savedId!);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                            data-testid={`button-delete-template-${template.savedId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              saveTemplateMutation.mutate({ label: template.label, icon: template.icon });
                              setOpenMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10 w-full text-left transition-colors"
                            data-testid={`button-save-template-${template.label.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            Save Template
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-card rounded-2xl p-5 shadow-sm border border-black/5 text-center">
              <Sparkles className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Templates will appear here as you create more quotes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}