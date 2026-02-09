import { ReactNode } from "react";
import { BottomNav, Sidebar } from "./Navigation";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-32">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
