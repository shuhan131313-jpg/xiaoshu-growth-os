"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ResearchRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { setTodayTask } from "@/lib/summary";
import { validManualMinutes } from "@/lib/research-rules";
import { inferredTimeRange } from "@/lib/time-blocks";

type FocusCategory = "数据" | "论文" | "申博";

const FOCUS_CATEGORY_META: Record<FocusCategory, { color: string; background: string }> = {
  数据: { color: "#5E7890", background: "#E8EFF4" },
  论文: { color: "#38506B", background: "#E4EAF0" },
  申博: { color: "#8A7567", background: "#F0EAE5" },
};
const FOCUS_CATEGORIES: FocusCategory[] = ["数据", "论文", "申博"];

function isFocusCategory(value: unknown): value is FocusCategory {
  return typeof value === "string" && FOCUS_CATEGORIES.includes(value as FocusCategory);
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ResearchPage() {
  const today = todayKey();
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [focusCategory, setFocusCategory] = useState<FocusCategory | "">("数据");
  const [focusMinutes, setFocusMinutes] = useState("");
  const [focusSaving, setFocusSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const focusSubmittingRef = useRef(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editCategory, setEditCategory] = useState<FocusCategory | "">("");
  const [editDuration, setEditDuration] = useState("");

  const todayMinutes = history
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.duration, 0);

  async function refresh() {
    // 清理旧的无关时长数据，避免继续保留已移除的记录。
    await repos.phone.clear();
    const all = await repos.research.all();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3000);
  }

  async function createSession(minutes: string, category: FocusCategory | "") {
    const dur = validManualMinutes(minutes);
    if (dur == null) return null;
    await repos.research.add({
      date: today,
      duration: dur,
      category: category || undefined,
      source: "manual",
      createdAt: Date.now(),
    });
    await setTodayTask(today, "research", true);
    await bumpGrowthStep();
    await refresh();
    return { duration: dur };
  }

  async function addFocusSession() {
    if (focusSubmittingRef.current) return;
    const minutes = validManualMinutes(focusMinutes);
    if (minutes == null) {
      if (minutes == null) showFeedback("请输入大于 0 的有效时长");
      return;
    }
    focusSubmittingRef.current = true;
    setFocusSaving(true);
    try {
      const result = await createSession(focusMinutes, focusCategory);
      if (result) {
        setFocusMinutes("");
        setFocusCategory("数据");
        showFeedback(`已记录专注 ${result.duration} min`);
      }
    } finally {
      focusSubmittingRef.current = false;
      setFocusSaving(false);
    }
  }

  function beginEdit(record: ResearchRecord) {
    setEditingId(record.id ?? null);
    setEditSummary(record.summary ?? "");
    setEditCategory(isFocusCategory(record.category) ? record.category : "");
    setEditDuration(String(record.duration));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSummary("");
    setEditCategory("");
    setEditDuration("");
  }

  async function saveEdit(record: ResearchRecord) {
    if (record.id == null) return;
    const duration = validManualMinutes(editDuration);
    if (duration == null) {
      showFeedback("请输入大于 0 的有效时长");
      return;
    }
    await repos.research.update(record.id, {
      duration,
      summary: editSummary.trim() || undefined,
      category: editCategory || undefined,
    });
    cancelEdit();
    await refresh();
    showFeedback("专注记录已更新");
  }

  async function deleteSession(record: ResearchRecord) {
    if (record.id == null || !window.confirm("确定删除这条专注记录吗？")) return;
    await repos.research.delete(record.id);
    if (editingId === record.id) cancelEdit();
    await refresh();
    showFeedback("专注记录已删除");
  }

  function CategorySelect({
    value,
    onChange,
    allowEmpty = false,
    ariaLabel,
  }: {
    value: FocusCategory | "";
    onChange: (value: FocusCategory | "") => void;
    allowEmpty?: boolean;
    ariaLabel: string;
  }) {
    const selected = value || "数据";
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as FocusCategory | "")}
        className="h-10 w-[88px] shrink-0 rounded-xl border bg-white px-2 text-xs outline-none"
        style={{ borderColor: FOCUS_CATEGORY_META[selected].color, color: FOCUS_CATEGORY_META[selected].color }}
        aria-label={ariaLabel}
      >
        {allowEmpty && <option value="">未分类</option>}
        {FOCUS_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
    );
  }

  const monthResearch = history.filter((record) => record.date.startsWith(selectedMonth));
  const monthValues = FOCUS_CATEGORIES.map((category) =>
    monthResearch
      .filter((record) => record.category === category)
      .reduce((sum, record) => sum + record.duration, 0)
  );
  const chartValues = monthValues;
  const chartMax = Math.max(60, ...chartValues, 0);
  const unclassifiedMinutes = monthResearch
    .filter((record) => !record.category)
    .reduce((sum, record) => sum + record.duration, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="专注" desc="为需要认真投入的事情留出一段时间" />

      {/* 完成后统一记录专注 */}
      <section id="focus-entry" className="scroll-mt-6 border-y border-line py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">记录专注</p>
            <p className="mt-1 text-[11px] text-ink-faint">完成后填写实际时长和类别</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink-faint">今日累计</p>
            <p className="tabular text-xl font-semibold text-ink">
              {todayMinutes}<span className="ml-1 text-xs font-normal text-ink-faint">min</span>
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {FOCUS_CATEGORIES.map((category) => {
            const selected = focusCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setFocusCategory(category)}
                aria-pressed={selected}
                className="h-10 rounded-xl border px-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: selected ? FOCUS_CATEGORY_META[category].color : "#D9DEDF",
                  color: selected ? FOCUS_CATEGORY_META[category].color : "#6F767D",
                  backgroundColor: selected ? FOCUS_CATEGORY_META[category].background : "#FFFFFF",
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(event.target.value)}
              onEnterSubmit={addFocusSession}
              enterKeyHint="done"
              placeholder="时长（分钟）"
              className="min-w-0"
              aria-label="专注时长（分钟）"
            />
          </div>
          <Button
            variant="accent"
            onClick={addFocusSession}
            disabled={focusSaving || validManualMinutes(focusMinutes) == null}
          >
            {focusSaving ? "保存中…" : "记录专注"}
          </Button>
        </div>

        {feedback && (
          <p className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-[#F2F2F0] px-3 py-2 text-xs text-ink-soft">
            <Check className="h-3.5 w-3.5 text-primary" /> {feedback}
          </p>
        )}
      </section>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">本月专注</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="上一个月" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="tabular min-w-[76px] text-center text-xs text-ink-soft">{selectedMonth.replace("-", "年")}月</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="下一个月"
                disabled={selectedMonth >= today.slice(0, 7)}
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4 grid h-44 grid-cols-4 items-end gap-2 border-b border-line px-2 pt-3">
            {FOCUS_CATEGORIES.map((category, index) => ({ label: category, value: monthValues[index], color: FOCUS_CATEGORY_META[category].color })).map((item) => (
              <div key={item.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
                <span className="tabular text-[10px] text-ink-faint">{item.value}</span>
                <div className="flex h-32 w-full items-end">
                  <div className="w-full rounded-t-md" style={{ height: `${(item.value / chartMax) * 100}%`, minHeight: item.value > 0 ? "3px" : "0", backgroundColor: item.color }} />
                </div>
                <span className="truncate text-[10px] text-ink-soft">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-[10px] text-ink-faint">单位：分钟</p>
          {unclassifiedMinutes > 0 && <p className="mt-1 text-xs text-ink-faint">未分类专注 {unclassifiedMinutes} 分钟</p>}
        </CardContent>
      </Card>

      {/* 专注记录（全部历史，跨月完整保留；统一折叠） */}
      {history.length > 0 && (
        <Card>
          <CardContent>
            <FoldList
              items={history}
              startCollapsed
              title={
                <p className="mb-3 text-sm font-medium text-primary">
                  专注记录（{history.length}）
                </p>
              }
              renderItem={(r) => (
                <div
                  key={r.id}
                  className="border-b border-line pb-3 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular text-sm font-medium text-ink">{r.date}</span>
                    {editingId === r.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={editDuration}
                          onChange={(event) => setEditDuration(event.target.value)}
                          className="h-8 w-20 px-2 text-xs"
                          aria-label="编辑专注时长"
                        />
                        <Button size="sm" variant="accent" onClick={() => saveEdit(r)}>保存</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>取消</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="tabular text-xs text-ink-faint">
                          {r.duration} 分钟 · {inferredTimeRange(r.createdAt, r.duration)}
                        </span>
                        <button type="button" className="rounded-md p-1 text-ink-faint hover:bg-line/50 hover:text-primary" onClick={() => beginEdit(r)} aria-label="编辑专注记录">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="rounded-md p-1 text-ink-faint hover:bg-line/50 hover:text-red-500" onClick={() => deleteSession(r)} aria-label="删除专注记录">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId === r.id ? (
                    <div className="mt-2 space-y-2">
                      <Input value={editSummary} onChange={(event) => setEditSummary(event.target.value)} placeholder="专注内容" aria-label="编辑专注内容" />
                      <CategorySelect value={editCategory} onChange={setEditCategory} allowEmpty ariaLabel="编辑专注分类" />
                    </div>
                  ) : isFocusCategory(r.category) ? (
                    <span
                      className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ color: FOCUS_CATEGORY_META[r.category].color, backgroundColor: FOCUS_CATEGORY_META[r.category].background }}
                    >
                      {r.category}
                    </span>
                  ) : null}
                  {editingId !== r.id && r.summary && (
                    <p className="mt-1 text-[13px] text-ink-soft">{r.summary}</p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
