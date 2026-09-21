"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListPlus,
  Plus,
  LineChart,
  UserRound,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

const RECORD_PATHS = NAV_ITEMS.filter(
  (item) => !["/", "/growth", "/settings"].includes(item.href)
);

const QUICK_PATHS = RECORD_PATHS.filter((item) =>
  ["/exercise", "/account", "/reading", "/research", "/experiment", "/gratitude"].includes(
    item.href
  )
);

export function MobileNav() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"records" | "quick" | null>(null);

  useEffect(() => setPanel(null), [pathname]);

  const inRecords = RECORD_PATHS.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {panel && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button
            className="absolute inset-0 bg-ink/25"
            onClick={() => setPanel(null)}
            aria-label="关闭导航菜单"
          />
          <section className="relative w-full rounded-t-2xl bg-surface px-5 pb-[calc(1.25rem+var(--safe-bottom))] pt-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-ink">
                  {panel === "records" ? "全部记录" : "快速新增"}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {panel === "records" ? "所有现有功能都保留在这里" : "选择要立即记录的内容"}
                </p>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-line"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {(panel === "records" ? RECORD_PATHS : QUICK_PATHS).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl bg-background px-2 py-3 text-center text-xs text-ink-soft"
                  >
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-safe md:hidden">
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-center px-2">
          <BottomLink href="/" label="今日" active={pathname === "/"} icon={Home} />
          <BottomButton
            label="记录"
            active={inRecords || panel === "records"}
            icon={ListPlus}
            onClick={() => setPanel("records")}
          />
          <button
            type="button"
            onClick={() => setPanel("quick")}
            aria-label="快速新增记录"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-soft active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
          <BottomLink
            href="/growth"
            label="统计"
            active={pathname.startsWith("/growth")}
            icon={LineChart}
          />
          <BottomLink
            href="/settings"
            label="我的"
            active={pathname.startsWith("/settings")}
            icon={UserRound}
          />
        </div>
      </nav>
    </>
  );
}

function BottomLink({ href, label, active, icon: Icon }: {
  href: string;
  label: string;
  active: boolean;
  icon: typeof Home;
}) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1 text-[10px]", active ? "text-primary" : "text-ink-faint")}>
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

function BottomButton({ label, active, icon: Icon, onClick }: {
  label: string;
  active: boolean;
  icon: typeof Home;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1 text-[10px]", active ? "text-primary" : "text-ink-faint")}>
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </button>
  );
}
