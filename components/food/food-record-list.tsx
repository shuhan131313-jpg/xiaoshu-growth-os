"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { FoodRecord } from "@/lib/db/db";
import { formatFoodTime } from "@/lib/food-rules";

interface FoodRecordListProps {
  records: FoodRecord[];
  onEdit: (record: FoodRecord) => void;
  onDelete: (record: FoodRecord) => void;
}

export function FoodRecordList({ records, onEdit, onDelete }: FoodRecordListProps) {
  return (
    <div className="divide-y divide-line">
      {records.map((record) => (
        <article key={record.id ?? `${record.createdAt}-${record.content}`} className="flex items-center gap-3 py-3.5">
          <time className="tabular w-11 shrink-0 text-xs text-ink-faint">
            {formatFoodTime(record.createdAt)}
          </time>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm text-ink">{record.content}</p>
              {record.isUnplanned && (
                <span className="shrink-0 rounded-full border border-[#D8C3A5] bg-[#F4EEE5] px-2 py-0.5 text-[10px] text-[#866C4E]">
                  计划外
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(record)}
              aria-label={`编辑 ${record.content}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-line/60 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(record)}
              aria-label={`删除 ${record.content}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#F4EEE5] hover:text-[#866C4E]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
