"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { FoodRecord } from "@/lib/db/db";
import { formatFoodTime } from "@/lib/food-rules";

interface FoodRecordListProps {
  records: FoodRecord[];
  onEdit: (record: FoodRecord) => void;
  onDelete: (record: FoodRecord) => void;
  onToggleStatus: (record: FoodRecord, isUnplanned: boolean) => void;
}

export function FoodRecordList({ records, onEdit, onDelete, onToggleStatus }: FoodRecordListProps) {
  return (
    <div className="divide-y divide-line">
      {records.map((record) => (
        <article key={record.id ?? `${record.createdAt}-${record.content}`} className="flex items-center gap-3 py-3.5">
          <time className="tabular w-11 shrink-0 text-xs text-ink-faint">
            {formatFoodTime(record.createdAt)}
          </time>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onEdit(record)} className="break-words text-left text-sm text-ink hover:text-primary">
              {record.content}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleStatus(record, true)}
              aria-label={`${record.content} 标记为计划外`}
              aria-pressed={record.isUnplanned}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${record.isUnplanned ? "bg-[#F4D3D0]" : "bg-line/50 hover:bg-[#F4EEE5]"}`}
            >
              <span className="h-3 w-3 rounded-full bg-[#C2554F]" />
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(record, false)}
              aria-label={`${record.content} 标记为正常饮食`}
              aria-pressed={!record.isUnplanned}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${!record.isUnplanned ? "bg-[#DCEBDD]" : "bg-line/50 hover:bg-[#EDF2EF]"}`}
            >
              <span className="h-3 w-3 rounded-full bg-[#5E8C6A]" />
            </button>
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
