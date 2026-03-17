import { useState, useEffect } from "react";
import { useActiveTimer, useStopTimer, formatDuration } from "@/hooks/use-timers";
import { useJobs } from "@/hooks/use-jobs";
import { useLocation } from "wouter";
import { Clock, Square } from "lucide-react";

export function ActiveTimerBanner() {
  const { data: activeTimer } = useActiveTimer();
  const stopTimer = useStopTimer();
  const { data: jobs } = useJobs();
  const [, setLocation] = useLocation();

  const [elapsed, setElapsed] = useState(0);

  // Live elapsed counter
  useEffect(() => {
    if (!activeTimer?.startTime) {
      setElapsed(0);
      return;
    }

    const calcElapsed = () => {
      const start = new Date(activeTimer.startTime).getTime();
      return Math.floor((Date.now() - start) / 1000);
    };

    setElapsed(calcElapsed());
    const interval = setInterval(() => {
      setElapsed(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.startTime]);

  if (!activeTimer) return null;

  const job = jobs?.find((j) => j.id === activeTimer.jobId);
  const jobTitle = job?.title || `Job #${activeTimer.jobId}`;

  const handleStop = () => {
    stopTimer.mutate({ id: activeTimer.id });
  };

  const handleNavigate = () => {
    setLocation(`/jobs/${activeTimer.jobId}`);
  };

  return (
    <div className="bg-blue-500/10 dark:bg-blue-500/15 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <button
          onClick={handleNavigate}
          className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline truncate"
        >
          {jobTitle}
        </button>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
          {formatDuration(elapsed)}
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={stopTimer.isPending}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0"
      >
        <Square className="w-3 h-3" />
        Stop
      </button>
    </div>
  );
}
