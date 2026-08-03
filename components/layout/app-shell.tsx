"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { AIFab } from "@/components/ai/ai-fab";
import { GlobalSearch } from "@/components/search/search-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen pb-24 pt-safe md:pb-0 md:pl-60 md:pt-0">
        <div className="mx-auto w-full max-w-2xl px-4 md:max-w-3xl md:px-8 md:py-10">
          {children}
        </div>
      </main>
      <BottomNav />
      <AIFab />
      <GlobalSearch />
    </>
  );
}
