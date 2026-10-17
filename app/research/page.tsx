"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, type TimerHandle } from "@/components/common/timer";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ResearchRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { setTodayTask } from "@/lib/summary";
import { clearResearchDraft, getResearchDraft, saveResearchDraft } from "@/lib/research-draft";
import { timerDurationMinutes, validManualMinutes } from "@/lib/research-rules";

export default function ResearchPage() {
  const today = todayKey();
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [timerActive, setTimerActive] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [manualSummary, setManualSummary] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const timerRef = useRef<TimerHandle>(null);
  const manualSubmittingRef = useRef(false);

  const todayMinutes = history
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.duration, 0);

  async function refresh() {
    const all = await repos.research.all();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    getResearchDraft().then(setSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3000);
  }

  async function createSession(
    elapsedSec: number,
    source: "timer" | "manual",
    text: string
  ) {
    const dur = source === "manual"
      ? validManualMinutes(elapsedSec / 60) ?? 1
      : timerDurationMinutes(elapsedSec);
    await repos.research.add({
      date: today,
      duration: dur,
      summary: text.trim() || undefined,
      source,
      createdAt: Date.now(),
    });
    await setTodayTask(today, "research", true);
    await bumpGrowthStep();
    await refresh();
    return { duration: dur };
  }

  async function saveSummaryOnly() {
    if (!summary.trim()) return;
    await saveResearchDraft(summary);
    showFeedback("本次专注内容已保存，计时继续");
  }

  async function finishTimer() {
    if (savingSession) return;
    const elapsedSec = timerRef.current?.finish();
    if (elapsedSec == null) return;
    setSavingSession(true);
    try {
      const result = await createSession(elapsedSec, "timer", summary);
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
      const result = await createSession(minutes * 60, "manual", manualSummary);
      setManualSummary("");
      setManualMinutes("");
      showFeedback(`已补充 ${result.duration} min`);
    } finally {
      manualSubmittingRef.current = false;
      setManualSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="专注" desc="为需要认真投入的事情留出一段时间" />

      {/* 专注计时 */}
      <section className="border-y border-line py-4">
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
        />

        <div className="mt-3">
          <Label>本次专注内容</Label>
          <Input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="修改 Discussion 和 Figure 2"
            maxLength={240}
          />
          <div className="mt-2 grid grid-cols-[0.8fr_1.2fr] gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={saveSummaryOnly}
              disabled={!summary.trim()}
            >
              仅保存小结
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={finishTimer}
              disabled={!timerActive || savingSession}
            >
              {savingSession ? "保存中…" : "结束并记录"}
            </Button>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-medium text-primary">补充记录</p>
          <Input
            value={manualSummary}
            onChange={(event) => setManualSummary(event.target.value)}
            placeholder="刚才修改了结果部分"
            maxLength={240}
          />
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
                  <div className="flex items-center justify-between">
                    <span className="tabular text-sm font-medium text-ink">
                      {r.date}
                    </span>
                    <span className="tabular text-xs text-ink-faint">
                      {r.duration} 分钟{r.source === "manual" ? " · 补录" : ""}
                    </span>
                  </div>
                  {r.summary && (
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
