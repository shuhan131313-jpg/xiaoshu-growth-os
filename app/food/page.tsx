"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cookie, History, Plus, Utensils } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FoodRecordList } from "@/components/food/food-record-list";
import { FoodRecordSheet } from "@/components/food/food-record-sheet";
import { Button } from "@/components/ui/button";
import { deleteFoodRecord, getFoodRecordsForDate } from "@/lib/food";
import { foodDaySummary, formatFoodDate, sortFoodRecords } from "@/lib/food-rules";
import { todayKey } from "@/lib/utils";
import type { FoodRecord } from "@/lib/db/db";

export default function FoodPage() {
  const today = useMemo(() => todayKey(), []);
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isUnplanned, setIsUnplanned] = useState(false);
  const [editing, setEditing] = useState<FoodRecord | undefined>();
  const summary = foodDaySummary(records);

  useEffect(() => {
    getFoodRecordsForDate(today)
      .then(setRecords)
      .finally(() => setReady(true));
  }, [today]);

  function openNew(unplanned: boolean) {
    setEditing(undefined);
    setIsUnplanned(unplanned);
    setSheetOpen(true);
  }

  function openEdit(record: FoodRecord) {
    setEditing(record);
    setIsUnplanned(record.isUnplanned);
    setSheetOpen(true);
  }

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
    <div className="space-y-5">
      <PageHeader
        title={`今天 · ${formatFoodDate(today)}`}
        desc={summary.total > 0
          ? `${summary.total} 次记录 · ${summary.unplanned} 次计划外`
          : "随手记下什么时候吃了什么，不做评价"}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="accent" onClick={() => openNew(false)}>
          <Plus className="h-4 w-4" /> 普通饮食
        </Button>
        <Button
          variant="outline"
          onClick={() => openNew(true)}
          className="border-[#D8C3A5] bg-[#F4EEE5] text-[#866C4E] hover:bg-[#EEE4D6]"
        >
          <Plus className="h-4 w-4" /> 计划外
        </Button>
      </div>

      <section className="border-y border-line">
        {!ready ? (
          <p className="py-10 text-center text-sm text-ink-faint">加载中…</p>
        ) : records.length === 0 ? (
          <div className="py-12 text-center">
            <Utensils className="mx-auto h-5 w-5 text-primary" strokeWidth={1.6} />
            <p className="mt-3 text-sm text-ink-soft">今天还没有饮食记录</p>
            <p className="mt-1 text-xs text-ink-faint">吃完随手记一句就好</p>
          </div>
        ) : (
          <FoodRecordList records={records} onEdit={openEdit} onDelete={remove} />
        )}
      </section>

      <Link
        href="/food/history"
        className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm text-ink-soft transition hover:bg-line/50"
      >
        <History className="h-4 w-4" /> 查看历史饮食
      </Link>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
        <Cookie className="h-3.5 w-3.5" /> “计划外”只是记录标签，不会自动扣除树叶
      </p>

      <FoodRecordSheet
        open={sheetOpen}
        isUnplanned={isUnplanned}
        existing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={saved}
      />
    </div>
  );
}
