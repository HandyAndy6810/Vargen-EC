import { Link, useLocation } from "wouter";
import { Home, FileText, Calendar, MessageSquare, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/quotes", icon: FileText, label: "Quotes" },
    { href: "/messages", icon: MessageSquare, label: "Messaging" },
    { href: "/customers", icon: Users, label: "Clients" },
    { href: "/jobs", icon: Calendar, label: "Calendar" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pointer-events-none">
      <nav className="max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-black/5 rounded-full px-6 py-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto transition-all duration-300 hover:scale-[1.02]">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className="cursor-pointer transition-all duration-200 active:scale-90 group relative flex flex-col items-center">
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/60"
                  )}
                />
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return null;
}
