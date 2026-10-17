"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, History, Utensils } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FoodRecordList } from "@/components/food/food-record-list";
import { FoodRecordSheet } from "@/components/food/food-record-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFoodRecord, deleteFoodRecord, getFoodDayMarkerState, getFoodRecordsForDate, toggleFoodDayMarker, updateFoodRecord } from "@/lib/food";
import { foodDaySummary, formatFoodDate, sortFoodRecords } from "@/lib/food-rules";
import { todayKey } from "@/lib/utils";
import type { FoodRecord } from "@/lib/db/db";
type FoodDayStatus = { protein: boolean; water: boolean };

export default function FoodPage() {
  const today = useMemo(() => todayKey(), []);
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FoodRecord | undefined>();
  const [foodText, setFoodText] = useState("");
  const [foodSaving, setFoodSaving] = useState(false);
  const [dayStatus, setDayStatus] = useState<FoodDayStatus>({ protein: false, water: false });
  const [feedback, setFeedback] = useState("");
  const foodSavingRef = useRef(false);
  const summary = foodDaySummary(records);

  useEffect(() => {
    Promise.all([getFoodRecordsForDate(today), getFoodDayMarkerState(today)])
      .then(([nextRecords, nextStatus]) => {
        setRecords(nextRecords);
        setDayStatus(nextStatus);
      })
      .finally(() => setReady(true));
  }, [today]);

  function openEdit(record: FoodRecord) {
    setEditing(record);
    setSheetOpen(true);
  }

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2500);
  }

  function saved(record: FoodRecord) {
    setRecords((current) =>
      sortFoodRecords([record, ...current.filter((item) => item.id !== record.id)])
    );
    showFeedback("已保存饮食记录");
  }

  async function addFood() {
    const content = foodText.trim();
    if (!content || foodSavingRef.current) return;
    foodSavingRef.current = true;
    setFoodSaving(true);
    try {
      const record = await addFoodRecord(content, false);
      setRecords((current) => sortFoodRecords([...current, record]));
      setFoodText("");
      showFeedback("已保存饮食记录");
    } finally {
      foodSavingRef.current = false;
      setFoodSaving(false);
    }
  }

  async function toggleStatus(record: FoodRecord, isUnplanned: boolean) {
    if (record.id == null || record.isUnplanned === isUnplanned) return;
    const updated = await updateFoodRecord(record.id, record.content, isUnplanned);
    setRecords((current) => sortFoodRecords(current.map((item) => item.id === updated.id ? updated : item)));
    showFeedback(isUnplanned ? "已标记为计划外饮食" : "已标记为正常饮食");
  }

  async function toggleDayStatus(field: keyof FoodDayStatus) {
    const marker = await toggleFoodDayMarker(today, field);
    setRecords((current) => marker
      ? sortFoodRecords([...current, marker])
      : current.filter((item) => item.content !== (field === "protein" ? "蛋白质达标" : "水达标")));
    setDayStatus((current) => ({ ...current, [field]: !current[field] }));
    showFeedback(marker ? `已记录${field === "protein" ? "蛋白质达标" : "水达标"}` : `已取消${field === "protein" ? "蛋白质达标" : "水达标"}`);
  }

  async function remove(record: FoodRecord) {
    if (record.id == null) return;
    if (!window.confirm(`删除“${record.content}”这条饮食记录吗？`)) return;
    await deleteFoodRecord(record.id);
    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (record.content === "蛋白质达标" || record.content === "水达标") {
      setDayStatus((current) => ({ ...current, [record.content === "蛋白质达标" ? "protein" : "water"]: false }));
    }
    showFeedback("已删除饮食记录");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`今天 · ${formatFoodDate(today)}`}
        desc={summary.total > 0
          ? `${summary.total} 次记录 · ${summary.unplanned} 次计划外`
          : "随手记下什么时候吃了什么，不做评价"}
      />

      <div className="grid grid-cols-2 gap-2">
        {([
          ["protein", "蛋白质"],
          ["water", "水"],
        ] as const).map(([field, label]) => {
          const selected = dayStatus[field];
          return (
            <button
              key={field}
              type="button"
              onClick={() => toggleDayStatus(field)}
              aria-pressed={selected}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm transition ${selected ? "border-[#D8B84C] bg-[#FFF4C7] text-[#806B20]" : "border-line bg-surface text-ink-soft hover:bg-line/40"}`}
            >
              {selected && <Check className="h-4 w-4" />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={foodText}
          onChange={(event) => setFoodText(event.target.value)}
          onEnterSubmit={addFood}
          enterKeyHint="done"
          placeholder="吃了什么？"
          maxLength={160}
        />
        <Button variant="accent" onClick={addFood} disabled={!foodText.trim() || foodSaving}>
          {foodSaving ? "保存中…" : "保存"}
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
          <FoodRecordList records={records} onEdit={openEdit} onDelete={remove} onToggleStatus={toggleStatus} />
        )}
      </section>

      {feedback && (
        <p className="rounded-lg bg-[#F2F2F0] px-3 py-2 text-center text-xs text-ink-soft">
          {feedback}
        </p>
      )}

      <Link
        href="/food/history"
        className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm text-ink-soft transition hover:bg-line/50"
      >
        <History className="h-4 w-4" /> 查看历史饮食
      </Link>

      <FoodRecordSheet
        open={sheetOpen}
        isUnplanned={editing?.isUnplanned ?? false}
        existing={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(undefined);
        }}
        onSaved={(record) => {
          saved(record);
          setSheetOpen(false);
          setEditing(undefined);
        }}
      />
    </div>
  );
}
