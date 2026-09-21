"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  UserRound,
  X,
  Leaf,
} from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

const RECORD_PATHS = [
  ...NAV_ITEMS.filter((item) => !["/", "/growth", "/settings"].includes(item.href)),
  { href: "/leaves?deduct=1", label: "树叶扣分", en: "Leaves", icon: Leaf },
];

const MY_PATHS = [
  { href: "/leaves", label: "树叶", en: "Leaves", icon: Leaf },
  ...NAV_ITEMS.filter((item) => ["/growth", "/settings"].includes(item.href)),
];

export function MobileNav() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"quick" | "mine" | null>(null);

  useEffect(() => setPanel(null), [pathname]);

  const inMine = MY_PATHS.some((item) => pathname.startsWith(item.href.split("?")[0]));
  const inRecords = !inMine && RECORD_PATHS.some((item) => pathname.startsWith(item.href));

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
                  {panel === "quick" ? "全部功能" : "我的"}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {panel === "quick" ? "选择要记录或查看的模块" : "统计、个人数据与设置"}
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
              {(panel === "quick" ? RECORD_PATHS : MY_PATHS).map((item) => {
                const Icon = item.icon;
                const label = item.href === "/exercise"
                  ? "运动 / 体重"
                  : item.href === "/settings"
                  ? "数据与设置"
                  : item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl bg-background px-2 py-3 text-center text-xs text-ink-soft"
                  >
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-safe md:hidden">
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-3 items-center px-5">
          <BottomLink href="/" label="今日" active={pathname === "/"} icon={Home} />
          <button
            type="button"
            onClick={() => setPanel("quick")}
            aria-label="快速新增记录"
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-soft active:scale-95 ${inRecords || panel === "quick" ? "ring-2 ring-primary/20 ring-offset-2" : ""}`}
          >
            <Plus className="h-6 w-6" />
          </button>
          <BottomButton
            label="我的"
            active={inMine || panel === "mine"}
            icon={UserRound}
            onClick={() => setPanel("mine")}
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
