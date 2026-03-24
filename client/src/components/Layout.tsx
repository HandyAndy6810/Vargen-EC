import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "./Navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (location !== "/login" && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
      </div>
    );
  }

  const isLoginPage = location === "/login";

  return (
    <div className="min-h-screen bg-background relative flex flex-col overflow-x-hidden">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-32 overflow-x-hidden">
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className={`flex-1 max-w-2xl mx-auto w-full px-4 pt-4 ${isLoginPage ? "" : "pb-32"}`}>
        {children}
      </main>
      {!isLoginPage && <BottomNav />}
    </div>
  );
}
