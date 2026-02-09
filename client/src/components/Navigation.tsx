import { Link, useLocation } from "wouter";
import { Home, ClipboardList, CalendarDays, MessageCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/quotes", icon: ClipboardList, label: "Quotes" },
    { href: "/jobs", icon: CalendarDays, label: "Calendar" },
    { href: "/messages", icon: MessageCircle, label: "Messages" },
    { href: "/profile", icon: UserRound, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 flex justify-center pointer-events-none">
      <nav
        className="bg-white/70 dark:bg-black/60 backdrop-blur-xl rounded-full px-7 py-3.5 flex items-center justify-between gap-7 shadow-[0_8px_32px_rgba(0,0,0,0.15)] pointer-events-auto border border-white/20 dark:border-white/10"
        style={{ 
          minWidth: "320px", 
          maxWidth: "400px", 
          width: "85vw",
          WebkitBackdropFilter: "blur(20px)",
        }}
        data-testid="nav-bottom-bar"
      >
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="cursor-pointer transition-all duration-200 active:scale-90 flex flex-col items-center"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    isActive ? "text-primary" : "text-[#8B8680]"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
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
