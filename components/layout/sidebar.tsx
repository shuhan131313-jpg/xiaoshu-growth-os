"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 路由切换时自动收起（移动端友好）
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 展开时的半透明遮罩，点击收起 */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-ink/20 backdrop-blur-[1px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface/95 backdrop-blur transition-[width] duration-300 ease-out",
          open ? "w-60" : "w-16"
        )}
      >
        {/* 顶部：折叠按钮 + 品牌 */}
        <div
          className={cn(
            "flex h-16 items-center gap-2 px-3",
            open ? "" : "justify-center"
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "收起侧边栏" : "展开侧边栏"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink-soft transition duration-200 hover:bg-line/60 active:scale-95"
          >
            {open ? (
              <PanelLeftClose className="h-6 w-6" strokeWidth={2.25} />
            ) : (
              <PanelLeftOpen className="h-6 w-6" strokeWidth={2.25} />
            )}
          </button>

          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300",
              open ? "opacity-100" : "w-0 opacity-0"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-dark">
              <Leaf className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">小树</div>
              <div className="text-[11px] text-ink-faint">Growth OS</div>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 px-3 py-2">
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
                  "flex h-12 items-center gap-3 rounded-2xl px-3 transition duration-200 active:scale-[0.98]",
                  active
                    ? "bg-accent/15 font-medium text-accent-dark"
                    : "text-ink-soft hover:bg-line/60"
                )}
              >
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2.25} />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap text-[15px] transition-all duration-300",
                    open ? "opacity-100" : "w-0 opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 底部说明 */}
        <div
          className={cn(
            "px-3 pb-5 text-[11px] text-ink-faint transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        >
          本地存储 · 离线可用
        </div>
      </aside>
    </>
  );
}
