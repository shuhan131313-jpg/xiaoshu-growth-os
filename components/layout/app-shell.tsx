"use client";

import { Sidebar } from "./sidebar";
import { AIFab } from "@/components/ai/ai-fab";
import { GlobalSearch } from "@/components/search/search-dialog";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen pb-[calc(88px+var(--safe-bottom))] pt-safe md:pb-0 md:pl-64">
        <div className="mx-auto w-full max-w-2xl px-5 py-7 md:max-w-3xl md:px-10 md:py-12">
          {children}
        </div>
      </main>
      <MobileNav />
      <AIFab />
      <GlobalSearch />
    </>
  );
}
