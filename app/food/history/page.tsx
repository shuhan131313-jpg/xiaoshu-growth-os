"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Utensils } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FoodRecordList } from "@/components/food/food-record-list";
import { FoodRecordSheet } from "@/components/food/food-record-sheet";
import { deleteFoodRecord, getAllFoodRecords } from "@/lib/food";
import { formatFoodDate, groupFoodRecordsByDay, sortFoodRecords } from "@/lib/food-rules";
import type { FoodRecord } from "@/lib/db/db";

export default function FoodHistoryPage() {
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<FoodRecord | undefined>();
  const groups = useMemo(() => groupFoodRecordsByDay(records), [records]);

  useEffect(() => {
    getAllFoodRecords()
      .then(setRecords)
      .finally(() => setReady(true));
  }, []);

  function saved(record: FoodRecord) {
    setRecords((current) =>
      sortFoodRecords([record, ...current.filter((item) => item.id !== record.id)])
    );
  }

  async function remove(record: FoodRecord) {
    if (record.id == null) return;
    if (!window.confirm(`删除“${record.content}”这条饮食记录吗？`)) return;
    await deleteFoodRecord(record.id);
    setRecords((current) => current.filter((item) => item.id !== record.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="饮食记录" desc="每天逐条记录，历史按本地自然日自动归档" />

      <Link
        href="/food"
        className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-primary transition hover:bg-line/50"
      >
        <ChevronLeft className="h-4 w-4" /> 返回今天
      </Link>

      {!ready ? (
        <p className="py-10 text-center text-sm text-ink-faint">加载中…</p>
      ) : groups.length === 0 ? (
        <div className="border-y border-line py-12 text-center">
          <Utensils className="mx-auto h-5 w-5 text-primary" strokeWidth={1.6} />
          <p className="mt-3 text-sm text-ink-soft">还没有饮食记录</p>
          <p className="mt-1 text-xs text-ink-faint">从今天开始随手记下一次饮食</p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.date}>
              <div className="flex items-end justify-between border-b border-line pb-2">
                <h2 className="text-base font-semibold text-ink">{formatFoodDate(group.date, true)}</h2>
                <p className="tabular text-[11px] text-ink-faint">
                  {group.total} 次 · {group.unplanned} 次计划外
                </p>
              </div>
              <FoodRecordList records={group.records} onEdit={setEditing} onDelete={remove} />
            </section>
          ))}
        </div>
      )}

      <FoodRecordSheet
        open={!!editing}
        isUnplanned={editing?.isUnplanned ?? false}
        existing={editing}
        onClose={() => setEditing(undefined)}
        onSaved={(record) => {
          saved(record);
          setEditing(undefined);
        }}
      />
    </div>
  );
}
