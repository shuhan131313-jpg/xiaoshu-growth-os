"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, RefreshCw, Check, Bookmark, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/common/timer";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ResearchRecord, FavoriteRecord } from "@/lib/db/db";
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
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);

  const curMonth = useMemo(() => today.slice(0, 7), [today]);
  const monthHistory = useMemo(
    () => history.filter((r) => r.date.startsWith(curMonth)),
    [history, curMonth]
  );

  const paperKey = `paper:${lit.title}`;
  const paperFav = favs.some((f) => f.type === "paper" && f.key === paperKey);

  async function refresh() {
    const all = await repos.research.all();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    setFavs(await repos.favorite.all());
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
          <p className="rounded-2xl bg-line/30 p-3 text-[13px] italic leading-7 text-ink-soft">
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
          <div className="rounded-2xl bg-primary/5 p-3">
            <p className="mb-1 text-sm font-medium text-primary">关联提示</p>
            <p className="text-[13px] leading-7 text-ink-soft">{lit.linkHint}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-primary">专业生词</p>
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

      {/* 写作记录（统一折叠） */}
      {monthHistory.length > 0 && (
        <Card>
          <CardContent>
            <FoldList
              items={monthHistory}
              title={
                <p className="mb-3 text-sm font-medium text-primary">
                  写作记录（{monthHistory.length}）
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
                      {r.duration} 分钟
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
