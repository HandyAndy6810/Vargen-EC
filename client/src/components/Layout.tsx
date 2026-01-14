import { ReactNode } from "react";
import { BottomNav, Sidebar } from "./Navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // If not authenticated, just render children (which will handle redirection or be the login page)
  if (!isAuthenticated) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-0 pb-16 md:pb-0 relative min-w-0">
        <main className="flex-1 overflow-x-hidden p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
