import { Link, useLocation } from "wouter";
import { Home, ClipboardList, CalendarDays, UserRound, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/quotes", icon: ClipboardList, label: "Quotes" },
  { href: "/invoices", icon: FileText, label: "Invoices" },
  { href: "/jobs", icon: CalendarDays, label: "Calendar" },
  { href: "/profile", icon: UserRound, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  const activeIndex = NAV_ITEMS.findIndex(
    (item) => location === item.href || (item.href !== "/" && location.startsWith(item.href))
  );

  const pillPercent = 100 / NAV_ITEMS.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 flex justify-center pointer-events-none">
      <nav
        className="liquid-glass-nav relative pointer-events-auto flex items-stretch rounded-[28px] p-1"
        style={{ minWidth: "320px", maxWidth: "400px", width: "85vw" }}
        data-testid="nav-bottom-bar"
      >
        {/* Sliding liquid glass pill */}
        <div
          className="liquid-glass-pill absolute top-1 bottom-1 rounded-[22px]"
          style={{
            left: `calc(${activeIndex * pillPercent}% + 3px)`,
            width: `calc(${pillPercent}% - 6px)`,
            transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />

        {NAV_ITEMS.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <Link key={item.href} href={item.href} style={{ flex: 1 }}>
              <div
                className="relative z-10 flex flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer select-none active:scale-90 transition-transform duration-150"
                style={{ minHeight: "52px" }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "text-primary" : "text-[#8B8680]"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {/* Label always in DOM so height stays fixed; invisible when inactive */}
                <span
                  className={cn(
                    "text-[9px] font-bold leading-none tracking-wide transition-all duration-300",
                    isActive ? "opacity-100 text-primary" : "opacity-0"
                  )}
                >
                  {item.label}
                </span>
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
