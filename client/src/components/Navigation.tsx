import { Link, useLocation } from "wouter";
import { Home, FileText, Calendar, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/quotes", icon: FileText, label: "Quotes" },
    { href: "/jobs", icon: Calendar, label: "Jobs" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-black/5 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl z-50 transition-all duration-300 hover:bg-white">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div className="cursor-pointer transition-all duration-200 active:scale-90 group relative">
              <item.icon
                className={cn(
                  "h-7 w-7 transition-colors",
                  isActive ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/60"
                )}
              />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  // We'll keep the Sidebar hidden or simplified since the mobile-first floating nav is the primary focus as per request
  return null;
}
