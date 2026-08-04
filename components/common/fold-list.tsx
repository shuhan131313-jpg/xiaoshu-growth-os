"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * 全站统一折叠列表：
 * - 默认仅展示最近 3 条；
 * - 条目 > 3 时自动折叠，显示「展开」按钮；
 * - 点开后查看全部（传入 items 已由调用方按月过滤），显示「收起」按钮。
 * 视觉与交互全站一致。
 */
export function FoldList<T>({
  items,
  title,
  empty,
  renderItem,
  className,
}: {
  items: T[];
  title?: ReactNode;
  empty?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
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
