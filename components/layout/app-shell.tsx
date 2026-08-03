"use client";

import { Sidebar } from "./sidebar";
import { AIFab } from "@/components/ai/ai-fab";
import { GlobalSearch } from "@/components/search/search-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen pl-16 pt-safe">
        <div className="mx-auto w-full max-w-2xl px-4 py-8 md:max-w-3xl md:px-8 md:py-10">
          {children}
        </div>
      </main>
      <AIFab />
      <GlobalSearch />
    </>
  );
}
