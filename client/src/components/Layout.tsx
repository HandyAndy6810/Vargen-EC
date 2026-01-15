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
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-32">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
