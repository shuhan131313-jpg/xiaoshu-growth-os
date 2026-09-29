"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, RefreshCw, Check, Bookmark, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, type TimerHandle } from "@/components/common/timer";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ResearchRecord, FavoriteRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { setTodayTask } from "@/lib/summary";
import { addResearchWithLeaves, getLeavesSummary } from "@/lib/leaves";
import { clearResearchDraft, getResearchDraft, saveResearchDraft } from "@/lib/research-draft";
import { timerDurationMinutes, validManualMinutes } from "@/lib/research-rules";
import {
  LITERATURE_POOL,
  pickDistinct,
  type LiteratureItem,
} from "@/lib/ai/content";

export default function ResearchPage() {
  const today = todayKey();
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [todayLeaves, setTodayLeaves] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [manualSummary, setManualSummary] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const timerRef = useRef<TimerHandle>(null);
  const manualSubmittingRef = useRef(false);

  const [lit, setLit] = useState<LiteratureItem>(LITERATURE_POOL[0]);
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);

  const paperKey = `paper:${lit.title}`;
  const paperFav = favs.some((f) => f.type === "paper" && f.key === paperKey);
  const todayMinutes = history
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.duration, 0);

  async function refresh() {
    const [all, leaves] = await Promise.all([
      repos.research.all(),
      getLeavesSummary(),
    ]);
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    setFavs(await repos.favorite.all());
    setTodayLeaves(leaves.bySourceToday.research || 0);
  }

  useEffect(() => {
    refresh();
    getResearchDraft().then(setSummary);
    setLit(pickDistinct(LITERATURE_POOL));
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
    const result = await addResearchWithLeaves({
      date: today,
      duration: dur,
      summary: text.trim() || undefined,
      source,
      createdAt: Date.now(),
    }, elapsedSec);
    await setTodayTask(today, "research", true);
    await bumpGrowthStep();
    await refresh();
    return { duration: dur, awarded: result.awarded };
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
      showFeedback(`已记录 ${result.duration} min · +${result.awarded} 🌿`);
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
      showFeedback(`已补充 ${result.duration} min · +${result.awarded} 🌿`);
    } finally {
      manualSubmittingRef.current = false;
      setManualSaving(false);
    }
  }

  async function togglePaperFav() {
    if (paperFav) {
      const ex = favs.find((f) => f.type === "paper" && f.key === paperKey);
      if (ex?.id) await repos.favorite.delete(ex.id);
    } else {
      await repos.favorite.add({
        type: "paper",
        key: paperKey,
        title: lit.title,
        author: lit.journal,
        excerpt: lit.excerpt,
        date: today,
        createdAt: Date.now(),
      });
    }
    setFavs(await repos.favorite.all());
  }

  async function removeFav(id?: number) {
    if (id == null) return;
    await repos.favorite.delete(id);
    setFavs(await repos.favorite.all());
  }

  return (
    <div className="space-y-5">
      <PageHeader title="论文专注" desc="专注写作，沉淀每日进展；顺手读一篇好文献" />

      {/* 写作计时 */}
      <section className="border-y border-line py-4">
        <div className="flex items-end justify-between pb-3">
          <div>
            <p className="text-[11px] text-ink-faint">今日累计</p>
            <p className="tabular mt-0.5 text-xl font-semibold text-ink">
              {todayMinutes}<span className="ml-1 text-xs font-normal text-ink-faint">min</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink-faint">今日获得</p>
            <p className="mt-0.5 text-sm font-medium text-primary">+{todayLeaves} 🌿</p>
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

      {/* 文献推荐 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <FlaskConical className="h-4 w-4" /> 今日科研文献推荐
          </span>
          <span className="mt-0.5 text-[10px] text-ink-faint">
            生物 / 食品营养方向 · 肠-骨轴 · 肠道微生物 · 体外消化 · 功能食品
          </span>
        </div>
        <button
          onClick={() => setLit((x) => pickDistinct(LITERATURE_POOL, x))}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
        >
          <RefreshCw className="h-3 w-3" /> 换一篇
        </button>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-ink">{lit.title}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{lit.journal}</p>
          </div>
          <p className="rounded-xl bg-line/30 p-3 text-[13px] italic leading-7 text-ink-soft">
            {lit.excerpt}
          </p>
          <div>
            <p className="text-sm font-medium text-primary">AI 中文总结</p>
            <p className="mt-1 text-[14px] leading-7 text-ink">{lit.cnSummary}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-primary">核心研究结论</p>
            <p className="mt-1 text-[14px] leading-7 text-ink">{lit.findings}</p>
          </div>
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="mb-1 text-sm font-medium text-primary">关联提示</p>
            <p className="text-[13px] leading-7 text-ink-soft">{lit.linkHint}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-primary">专业生词</p>
            <div className="flex flex-wrap gap-2">
              {lit.vocab.map((v) => (
                <span
                  key={v.term}
                  className="rounded-xl bg-line/30 px-3 py-1.5 text-[13px]"
                >
                  <span className="font-medium text-primary">{v.term}</span>
                  <span className="ml-2 text-ink-soft">{v.meaning}</span>
                </span>
              ))}
            </div>
          </div>
          <Button
            variant={paperFav ? "soft" : "accent"}
            className="w-full"
            onClick={togglePaperFav}
          >
            <Bookmark
              className={paperFav ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4"}
            />
            {paperFav ? "已收藏此文献" : "收藏此文献"}
          </Button>
        </CardContent>
      </Card>

      {/* 写作记录（全部历史，跨月完整保留；统一折叠） */}
      {history.length > 0 && (
        <Card>
          <CardContent>
            <FoldList
              items={history}
              title={
                <p className="mb-3 text-sm font-medium text-primary">
                  写作记录（{history.length}）
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

      {/* 收藏文献（来自收藏夹 paper 列表） */}
      {favs.some((f) => f.type === "paper") && (
        <Card>
          <CardContent>
            <p className="mb-3 text-sm font-medium text-primary">已收藏文献</p>
            <ul className="space-y-2">
              {favs
                .filter((f) => f.type === "paper")
                .map((l) => (
                  <li
                    key={l.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-ink">{l.title}</span>
                      {l.author && (
                        <span className="ml-2 text-xs text-ink-faint">
                          {l.author}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeFav(l.id)}
                      aria-label="删除收藏"
                      className="shrink-0 text-ink-faint transition duration-200 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
