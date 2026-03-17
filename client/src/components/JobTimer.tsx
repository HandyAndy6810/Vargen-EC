import { useState, useEffect } from "react";
import {
  useActiveTimer,
  useTimerEntries,
  useStartTimer,
  useStopTimer,
  useDeleteTimerEntry,
  formatDuration,
} from "@/hooks/use-timers";
import { Play, Square, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobTimerProps {
  jobId: number;
}

export function JobTimer({ jobId }: JobTimerProps) {
  const { data: activeTimer } = useActiveTimer();
  const { data: entries = [] } = useTimerEntries(jobId);
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const deleteEntry = useDeleteTimerEntry();

  const [elapsed, setElapsed] = useState(0);
  const [stopNotes, setStopNotes] = useState("");

  const isRunningOnThisJob = activeTimer?.jobId === jobId;
  const isRunningOnAnotherJob = !!activeTimer && activeTimer.jobId !== jobId;

  // Live elapsed counter when timer is running on this job
  useEffect(() => {
    if (!isRunningOnThisJob || !activeTimer?.startTime) {
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
  }, [isRunningOnThisJob, activeTimer?.startTime]);

  const handleStart = () => {
    startTimer.mutate(jobId);
  };

  const handleStop = () => {
    if (!activeTimer) return;
    stopTimer.mutate({ id: activeTimer.id, notes: stopNotes || undefined });
    setStopNotes("");
  };

  const handleDeleteEntry = (entryId: number) => {
    deleteEntry.mutate(entryId);
  };

  // Total tracked time from completed entries
  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

  return (
    <div className="space-y-4">
      {/* Timer Control Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-bold text-base text-foreground">Job Timer</h3>
          </div>
          {totalSeconds > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              Total: {formatDuration(totalSeconds)}
            </span>
          )}
        </div>

        {isRunningOnAnotherJob && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              Timer running on another job
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
              Stop the other timer before starting one here.
            </p>
          </div>
        )}

        {/* Live timer display */}
        {isRunningOnThisJob && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-3xl font-bold text-green-700 dark:text-green-400 tabular-nums">
              {formatDuration(elapsed)}
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">
              Timer running
            </p>
          </div>
        )}

        {/* Stop notes input (only when running) */}
        {isRunningOnThisJob && (
          <input
            type="text"
            value={stopNotes}
            onChange={(e) => setStopNotes(e.target.value)}
            placeholder="Add notes before stopping (optional)"
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-[#F8F7F5] dark:bg-white/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}

        {/* Start / Stop button */}
        <Button
          onClick={isRunningOnThisJob ? handleStop : handleStart}
          disabled={isRunningOnAnotherJob || startTimer.isPending || stopTimer.isPending}
          className={cn(
            "w-full h-14 rounded-2xl text-base font-bold shadow-lg transition-all",
            isRunningOnThisJob
              ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
              : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
          )}
        >
          {isRunningOnThisJob ? (
            <>
              <Square className="w-5 h-5 mr-2" />
              Stop Timer
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start Timer
            </>
          )}
        </Button>
      </div>

      {/* Timer History */}
      {entries.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/10 p-5">
          <h4 className="font-bold text-sm text-foreground mb-3">Timer History</h4>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-[#F8F7F5] dark:bg-white/5 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.duration ? formatDuration(entry.duration) : "In progress"}
                    </span>
                    {entry.startTime && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.startTime).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
