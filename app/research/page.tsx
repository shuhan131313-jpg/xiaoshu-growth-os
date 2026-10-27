"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, type TimerHandle } from "@/components/common/timer";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { PhoneRecord, ResearchRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { setTodayTask } from "@/lib/summary";
import { clearResearchDraft, getResearchDraft, saveResearchDraft } from "@/lib/research-draft";
import { timerDurationMinutes, validManualMinutes } from "@/lib/research-rules";

type FocusCategory = "数据" | "论文" | "申博" | "求职";

const FOCUS_CATEGORY_META: Record<FocusCategory, { color: string; background: string }> = {
  数据: { color: "#5E7890", background: "#E8EFF4" },
  论文: { color: "#38506B", background: "#E4EAF0" },
  申博: { color: "#8A7567", background: "#F0EAE5" },
  求职: { color: "#6E887D", background: "#E7EFEB" },
};
const FOCUS_CATEGORIES: FocusCategory[] = ["数据", "论文", "申博", "求职"];
const PHONE_COLOR = "#A08068";

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ResearchPage() {
  const today = todayKey();
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [phoneHistory, setPhoneHistory] = useState<PhoneRecord[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [focusCategory, setFocusCategory] = useState<FocusCategory>("数据");
  const [manualCategory, setManualCategory] = useState<FocusCategory | "">("");
  const [timerActive, setTimerActive] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [manualSummary, setManualSummary] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const timerRef = useRef<TimerHandle>(null);
  const manualSubmittingRef = useRef(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editCategory, setEditCategory] = useState<FocusCategory | "">("");
  const [editDuration, setEditDuration] = useState("");

  const todayMinutes = history
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.duration, 0);

  async function refresh() {
    const [all, phones] = await Promise.all([repos.research.all(), repos.phone.all()]);
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    setPhoneHistory(phones.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    getResearchDraft().then((draft) => {
      setSummary(draft);
      setDraftReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      if (summary.trim()) void saveResearchDraft(summary);
      else void clearResearchDraft();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [summary, draftReady]);

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3000);
  }

  async function createSession(
    elapsedSec: number,
    source: "timer" | "manual",
    text: string,
    category: FocusCategory | undefined
  ) {
    const dur = source === "manual"
      ? validManualMinutes(elapsedSec / 60) ?? 1
      : timerDurationMinutes(elapsedSec);
    await repos.research.add({
      date: today,
      duration: dur,
      summary: text.trim() || undefined,
      category,
      source,
      createdAt: Date.now(),
    });
    await setTodayTask(today, "research", true);
    await bumpGrowthStep();
    await refresh();
    return { duration: dur };
  }

  async function finishTimer() {
    if (savingSession) return;
    const elapsedSec = timerRef.current?.finish();
    if (elapsedSec == null) return;
    setSavingSession(true);
    try {
      const result = await createSession(elapsedSec, "timer", summary, focusCategory);
      await clearResearchDraft();
      setSummary("");
      timerRef.current?.reset();
      showFeedback(`已记录 ${result.duration} min`);
    } finally {
      setSavingSession(false);
    }
  }

  async function addManualSession() {
    const minutes = validManualMinutes(manualMinutes);
    if (minutes == null || manualSubmittingRef.current) {
      if (minutes == null) showFeedback("请输入大于 0 的有效时长");
      return;
    }
    manualSubmittingRef.current = true;
    setManualSaving(true);
    try {
      const result = await createSession(minutes * 60, "manual", manualSummary, manualCategory || undefined);
      setManualSummary("");
      setManualMinutes("");
      setManualCategory("");
      showFeedback(`已补充 ${result.duration} min`);
    } finally {
      manualSubmittingRef.current = false;
      setManualSaving(false);
    }
  }

  async function addPhoneRecord() {
    const duration = Number(phoneInput);
    if (!Number.isFinite(duration) || duration <= 0) {
      showFeedback("请输入有效的玩手机时长");
      return;
    }
    await repos.phone.add({ date: today, duration, createdAt: Date.now() });
    setPhoneInput("");
    await refresh();
    showFeedback(`已记录玩手机 ${duration} min`);
  }

  function beginEdit(record: ResearchRecord) {
    setEditingId(record.id ?? null);
    setEditSummary(record.summary ?? "");
    setEditCategory(record.category ?? "");
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
  const monthPhone = phoneHistory.filter((record) => record.date.startsWith(selectedMonth));
  const monthValues = FOCUS_CATEGORIES.map((category) =>
    monthResearch
      .filter((record) => record.category === category)
      .reduce((sum, record) => sum + record.duration, 0)
  );
  const phoneMinutes = monthPhone.reduce((sum, record) => sum + record.duration, 0);
  const chartValues = [...monthValues, phoneMinutes];
  const chartMax = Math.max(60, ...chartValues, 0);
  const unclassifiedMinutes = monthResearch
    .filter((record) => !record.category)
    .reduce((sum, record) => sum + record.duration, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="专注" desc="为需要认真投入的事情留出一段时间" />

      <section className="border-y border-line py-3">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-ink-soft">玩手机</span>
          <div className="relative min-w-0 flex-1">
            <Input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              onEnterSubmit={addPhoneRecord}
              enterKeyHint="done"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="1"
              placeholder="时长（分钟）"
              aria-label="玩手机时长（分钟）"
            />
          </div>
          <Button variant="outline" size="sm" onClick={addPhoneRecord}>记录</Button>
        </div>
      </section>

      {/* 专注计时 */}
      <section id="focus-timer" className="scroll-mt-6 border-y border-line py-4">
        <div className="pb-3">
          <div>
            <p className="text-[11px] text-ink-faint">今日累计</p>
            <p className="tabular mt-0.5 text-xl font-semibold text-ink">
              {todayMinutes}<span className="ml-1 text-xs font-normal text-ink-faint">min</span>
            </p>
          </div>
        </div>

        <Timer
          ref={timerRef}
          size={128}
          className="py-1"
          disabled={savingSession}
          onActiveChange={setTimerActive}
          startControl={
            <CategorySelect
              value={focusCategory}
              onChange={(value) => setFocusCategory(value as FocusCategory)}
              ariaLabel="专注分类"
            />
          }
        />

        <div className="mt-3">
          <Label>本次专注内容</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="本次专注内容"
              maxLength={240}
              className="min-w-0 flex-1"
            />
            <Button
              variant="accent"
              className="shrink-0 whitespace-nowrap px-3 text-xs"
              onClick={finishTimer}
              disabled={!timerActive || savingSession}
            >
              {savingSession ? "保存中…" : "结束并记录"}
            </Button>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-medium text-primary">补充记录</p>
          <div className="flex items-center gap-2">
            <Input
              value={manualSummary}
              onChange={(event) => setManualSummary(event.target.value)}
              placeholder="补充记录内容"
              maxLength={240}
              className="min-w-0 flex-1"
            />
            <CategorySelect
              value={manualCategory}
              onChange={setManualCategory}
              allowEmpty
              ariaLabel="补充记录分类"
            />
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={manualMinutes}
                onChange={(event) => setManualMinutes(event.target.value)}
                onEnterSubmit={addManualSession}
                enterKeyHint="done"
                placeholder="时长"
                className="pr-10"
                aria-label="补充记录时长（分钟）"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
                min
              </span>
            </div>
            <Button
              variant="outline"
              onClick={addManualSession}
              disabled={manualSaving || validManualMinutes(manualMinutes) == null}
            >
              {manualSaving ? "保存中…" : "补充记录"}
            </Button>
          </div>
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
          <div className="mt-4 grid h-44 grid-cols-5 items-end gap-2 border-b border-line px-2 pt-3">
            {[
              ...FOCUS_CATEGORIES.map((category, index) => ({ label: category, value: monthValues[index], color: FOCUS_CATEGORY_META[category].color })),
              { label: "玩手机", value: phoneMinutes, color: PHONE_COLOR },
            ].map((item) => (
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
                    <span className="tabular text-sm font-medium text-ink">
                      {r.date}
                    </span>
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
                          {r.duration} 分钟{r.source === "manual" ? " · 补录" : ""}
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
                  ) : r.category && FOCUS_CATEGORY_META[r.category] ? (
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
