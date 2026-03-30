import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessFlashProps {
  show: boolean;
  message?: string;
  onDone?: () => void;
  duration?: number;
}

export function SuccessFlash({ show, message = "Done!", onDone, duration = 1400 }: SuccessFlashProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [show, onDone, duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5" style={{ animation: "successPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div className="w-28 h-28 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/50">
          <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-white font-bold text-xl tracking-tight drop-shadow">{message}</p>
      </div>
      <style>{`
        @keyframes successPop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
