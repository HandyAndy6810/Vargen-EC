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
    { href: "/jobs", icon: Calendar, label: "Calendar" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 flex justify-center pointer-events-none">
      <nav className="bg-white rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl pointer-events-auto border border-black/5">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className="cursor-pointer transition-all duration-200 active:scale-90 group relative flex flex-col items-center">
                <item.icon
                  className={cn(
                    "h-7 w-7 transition-colors",
                    isActive ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/60"
                  )}
                />
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
