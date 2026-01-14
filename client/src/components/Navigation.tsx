import { Link, useLocation } from "wouter";
import { Home, Users, Briefcase, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/quotes", icon: FileText, label: "Quotes" },
    { href: "/customers", icon: Users, label: "Customers" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center py-2 transition-all duration-200 active:scale-95 cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 mb-1 transition-all",
                    isActive && "stroke-[2.5px]"
                  )}
                />
                <span className="text-[10px] font-medium tracking-tight">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/quotes", icon: FileText, label: "Quotes" },
    { href: "/customers", icon: Users, label: "Customers" },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent">
          Vargenezey
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <div
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium cursor-pointer group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 mr-3", isActive ? "stroke-[2.5px]" : "group-hover:stroke-primary")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center p-2 mb-2">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-8 h-8 rounded-full mr-3" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-muted-foreground">
              <User className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
