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
  const ACTION_WIDTH = 76 * actions.length;
  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
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
    startY.current = e.touches[0].clientY;
    baseX.current = translateX;
    axis.current = null;
    active.current = false;
    setAnimating(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
    }

    if (axis.current !== "h") return;

    e.preventDefault();
    active.current = true;

    const raw = baseX.current + dx;
    // Only allow swiping left (negative), not past full reveal
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, raw));
    setTranslateX(clamped);
  };

  const onTouchEnd = () => {
    if (!active.current) return;
    active.current = false;
    setAnimating(true);
    if (translateX < -(ACTION_WIDTH * 0.4)) {
      setTranslateX(-ACTION_WIDTH);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Revealed action buttons */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: ACTION_WIDTH }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => { close(); action.onClick(); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-white text-xs font-bold select-none",
              action.bgClass
            )}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Sliding content */}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: animating ? "transform 0.22s ease-out" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (translateX < 0) close(); }}
      >
        {children}
      </div>
    </div>
  );
}
