import { ArrowLeft, Menu, Bell, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function Header({ title, showBack, actions }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 h-16 flex items-center px-4 md:px-8 justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => window.history.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {title || "Vargenezey"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        
        {/* Placeholder AI Trigger - could open a modal */}
        <button className="md:hidden w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-orange-400 text-white flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-transform">
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
