"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TreePine } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-24 items-center gap-3 border-b border-line px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <TreePine className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight text-ink">树</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-faint">Growth OS</div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 px-4 py-5">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 transition duration-200",
                  active
                    ? "bg-[#EDF1F5] font-medium text-primary"
                    : "text-ink-soft hover:bg-line/60"
                )}
              >
                <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} />
                <span className="text-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 底部说明 */}
        <div className="border-t border-line px-6 py-5 text-[11px] text-ink-faint">
          数据存储在本机 · 支持离线
        </div>
      </aside>
  );
}
