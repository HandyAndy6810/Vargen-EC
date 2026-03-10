import { useMemo } from "react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Target } from "lucide-react";
import type { Quote } from "@shared/schema";

const GOAL_KEY = "vargenezey_weekly_revenue_goal";

export function getWeeklyGoal(): number {
  const raw = localStorage.getItem(GOAL_KEY);
  return raw ? Number(raw) : 0;
}

export function setWeeklyGoal(value: number) {
  localStorage.setItem(GOAL_KEY, String(value));
}

interface Props {
  quotes?: Quote[];
}

export function WeeklyRevenueGoalWidget({ quotes = [] }: Props) {
  const goal = getWeeklyGoal();

  const earned = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return quotes
      .filter((q) => {
        if (q.status !== "accepted") return false;
        if (!q.createdAt) return false;
        return isWithinInterval(new Date(q.createdAt), { start: weekStart, end: weekEnd });
      })
      .reduce((sum, q) => sum + Number(q.totalAmount), 0);
  }, [quotes]);

  const progress = goal > 0 ? Math.min(1, earned / goal) : 0;
  const remaining = Math.max(0, goal - earned);
  const isComplete = goal > 0 && earned >= goal;

  const radius = 38;
  const stroke = 7;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference * (1 - progress);

  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
      : `$${Math.round(n).toLocaleString()}`;

  if (goal === 0) return null;

  return (
    <div
      className="bg-white dark:bg-card rounded-[2rem] p-5 shadow-sm border border-black/5 flex items-center gap-5"
      data-testid="widget-weekly-goal"
    >
      <div className="shrink-0 relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg width={radius * 2} height={radius * 2} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/5 dark:text-white/10"
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">
            {goal > 0 ? `${Math.round(progress * 100)}%` : "—"}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center gap-1.5">
          <Target className="w-3 h-3" /> Weekly Goal
        </p>
        <p className="text-3xl font-bold text-foreground leading-none mb-0.5" data-testid="text-earned-amount">
          {fmt(earned)}
        </p>
        <p className="text-xs text-muted-foreground" data-testid="text-goal-target">
          of {fmt(goal)}
        </p>
        {isComplete ? (
          <p className="text-xs font-bold text-emerald-500 mt-1" data-testid="text-goal-complete">
            🎉 Goal reached!
          </p>
        ) : (
          <p className="text-xs font-bold text-emerald-500 mt-1" data-testid="text-goal-remaining">
            {fmt(remaining)} to go
          </p>
        )}
      </div>
    </div>
  );
}
