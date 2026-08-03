"use client";

import { useEffect, useState } from "react";
import { FlaskConical, RefreshCw, Check, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/common/timer";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ResearchRecord, LiteratureItem as DbLiterature } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import {
  LITERATURE_POOL,
  pickDistinct,
  type LiteratureItem,
} from "@/lib/ai/content";

export default function ResearchPage() {
  const today = todayKey();
  const [goalMin, setGoalMin] = useState(60);
  const [summary, setSummary] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [saved, setSaved] = useState(false);

  const [lit, setLit] = useState<LiteratureItem>(LITERATURE_POOL[0]);
  const [litSaved, setLitSaved] = useState(false);
  const [litHistory, setLitHistory] = useState<DbLiterature[]>([]);

  async function refresh() {
    const all = await repos.research.all();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    const ls = await repos.literature.all();
    setLitHistory(ls.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8));
  }

  useEffect(() => {
    refresh();
    setLit(pickDistinct(LITERATURE_POOL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSession(elapsedSec: number) {
    const dur = Math.max(1, Math.round(elapsedSec / 60));
    await repos.research.add({
      date: today,
      duration: dur,
      summary: summary.trim() || undefined,
      createdAt: Date.now(),
    });
    setSummary("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }

  async function saveLit() {
    await repos.literature.add({ ...lit, date: today, createdAt: Date.now() });
    setLitSaved(true);
    setTimeout(() => setLitSaved(false), 2000);
    refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="论文科研" desc="专注写作，沉淀每日进展；顺手读一篇好文献" />

      {/* 写作计时 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-2">
          <div className="w-full">
            <Label>每日目标时长（分钟）</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={goalMin}
              onChange={(e) => setGoalMin(Number(e.target.value) || 0)}
              className="max-w-[160px]"
            />
          </div>
          <Timer
            key={timerKey}
            mode="countup"
            goalLabel={`目标 ${goalMin} 分钟`}
            onStop={saveSession}
          />
          {saved && (
            <p className="flex items-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已保存写作记录
            </p>
          )}
          <div className="w-full">
            <Label>当日工作小结（结束计时后随记录保存）</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="今天推进了哪部分、卡在哪里、明天计划…"
              rows={3}
            />
            <Button
              variant="soft"
              className="mt-3 w-full"
              onClick={() => saveSession(goalMin * 60)}
              disabled={!summary.trim()}
            >
              仅保存小结
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 文献推荐 */}
      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <FlaskConical className="h-4 w-4" /> 今日文献推荐
        </span>
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
          <p className="rounded-2xl bg-line/30 p-3 text-[13px] italic leading-7 text-ink-soft">
            {lit.excerpt}
          </p>
          <div>
            <p className="text-sm font-medium text-ink-soft">AI 中文总结</p>
            <p className="mt-1 text-[14px] leading-7 text-ink">{lit.cnSummary}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-soft">核心发现</p>
            <p className="mt-1 text-[14px] leading-7 text-ink">{lit.findings}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">专业生词</p>
            <div className="flex flex-wrap gap-2">
              {lit.vocab.map((v) => (
                <span
                  key={v.term}
                  className="rounded-2xl bg-line/30 px-3 py-1.5 text-[13px]"
                >
                  <span className="font-medium text-primary">{v.term}</span>
                  <span className="ml-2 text-ink-soft">{v.meaning}</span>
                </span>
              ))}
            </div>
          </div>
          <Button
            variant="soft"
            className="w-full"
            onClick={saveLit}
            disabled={litSaved}
          >
            <Bookmark className="h-4 w-4" />
            {litSaved ? "已收藏此文献" : "收藏此文献"}
          </Button>
        </CardContent>
      </Card>

      {/* 写作历史 */}
      {history.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-3 text-sm font-medium text-ink-soft">写作记录</p>
            <ul className="space-y-3">
              {history.map((r) => (
                <li key={r.id} className="border-b border-line pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="tabular text-sm font-medium text-ink">
                      {r.date}
                    </span>
                    <span className="tabular text-xs text-ink-faint">
                      {r.duration} 分钟
                    </span>
                  </div>
                  {r.summary && (
                    <p className="mt-1 text-[13px] text-ink-soft">{r.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 收藏文献 */}
      {litHistory.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-3 text-sm font-medium text-ink-soft">已收藏文献</p>
            <ul className="space-y-2">
              {litHistory.map((l) => (
                <li key={l.id} className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{l.title}</span>
                  <span className="ml-2 text-xs text-ink-faint">{l.journal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
