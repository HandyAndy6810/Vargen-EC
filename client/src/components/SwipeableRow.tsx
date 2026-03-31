import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
}

export function SwipeableRow({ children, actions, className }: SwipeableRowProps) {
  const ACTION_WIDTH = 64 * actions.length;
  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const startX = useRef(0);
  const baseX = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const active = useRef(false);

  const snapTo = (target: number) => {
    setAnimating(true);
    setTranslateX(target);
  };

  const close = () => snapTo(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    baseX.current = translateX;
    axis.current = null;
    active.current = false;
    setAnimating(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;

    if (!axis.current) {
      if (Math.abs(dx) < 5) return;
      axis.current = "h";
    }

    e.preventDefault();
    active.current = true;
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, baseX.current + dx));
    setTranslateX(clamped);
  };

  const onTouchEnd = () => {
    if (!active.current) return;
    active.current = false;
    setAnimating(true);
    setTranslateX(translateX < -(ACTION_WIDTH * 0.35) ? -ACTION_WIDTH : 0);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/*
        Track approach: content + action are laid out side-by-side in a
        wider-than-container row. overflow-hidden on the parent clips the
        action off-screen until the track slides left.
      */}
      <div
        style={{
          display: "flex",
          width: `calc(100% + ${ACTION_WIDTH}px)`,
          transform: `translateX(${translateX}px)`,
          transition: animating ? "transform 0.2s ease-out" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (translateX < 0) close(); }}
      >
        {/* Main content — fills the visible area */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {children}
        </div>

        {/* Action buttons — hidden off-screen until swiped */}
        <div style={{ width: ACTION_WIDTH, flexShrink: 0 }} className="flex items-center justify-end pr-3 gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); close(); action.onClick(); }}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform",
                action.bgClass
              )}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
