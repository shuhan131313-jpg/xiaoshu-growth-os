"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * 全站统一折叠列表：
 * - 默认仅展示最近 3 条；
 * - 条目 > 3 时自动折叠，显示「展开」按钮；
 * - 点开后查看全部（传入 items 已由调用方按月过滤），显示「收起」按钮。
 * 视觉与交互全站一致。
 *
 * startCollapsed=true 时：整段在页面加载时默认收起，仅显示标题与展开入口，
 * 需用户手动点击标题展开；展开后仍保留原「>3 条展开/收起」与删除交互。
 */
export function FoldList<T>({
  items,
  title,
  empty,
  renderItem,
  className,
  startCollapsed = false,
}: {
  items: T[];
  title?: ReactNode;
  empty?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  startCollapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(startCollapsed);

  // startCollapsed=false：完全沿用原有行为
  if (!startCollapsed) {
    const visible = expanded ? items : items.slice(0, 3);
    return (
      <div className={className}>
        {title}
        {items.length === 0 ? (
          empty
        ) : (
          <div className="space-y-3">{visible.map((it, i) => renderItem(it, i))}</div>
        )}
        {items.length > 3 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs text-ink-faint transition duration-200 hover:text-primary"
            >
              {expanded ? "收起" : "展开"}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}
      </div>
    );
  }

  // startCollapsed=true：整段默认收起，点击标题展开/收起
  const visible = expanded ? items : items.slice(0, 3);
  return (
    <div className={className}>
      {title != null && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left transition duration-200 hover:bg-line/50"
        >
          <span className="min-w-0">{title}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </button>
      )}
      {!collapsed &&
        (items.length === 0 ? (
          empty
        ) : (
          <div className="mt-3 space-y-3">{visible.map((it, i) => renderItem(it, i))}</div>
        ))}
      {!collapsed && items.length > 3 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-ink-faint transition duration-200 hover:text-primary"
          >
            {expanded ? "收起" : "展开"}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
