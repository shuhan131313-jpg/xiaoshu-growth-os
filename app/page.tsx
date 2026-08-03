"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  BookOpen,
  Languages,
  Flame,
  Sprout,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GROWTH_MODULES } from "@/lib/constants";
import { todayKey, greeting, weekdayCN } from "@/lib/utils";
import {
  getTodayTaskMap,
  setTodayTask,
  getTodayDuration,
  getHeatmap,
} from "@/lib/summary";
import {
  BOOK_POOL,
  ENGLISH_POOL,
  pickDistinct,
  type BookExcerpt,
  type EnglishPassage,
} from "@/lib/ai/content";

function heatColor(count: number, max: number): string {
  if (count <= 0) return "#ECE6DD";
  const a = 0.25 + 0.75 * (count / max);
  return `rgba(152,175,148,${a.toFixed(2)})`;
}

export default function TodayPage() {
  const date = useMemo(() => todayKey(), []);
  const [taskMap, setTaskMap] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState(0);
  const [heat, setHeat] = useState<{ date: string; count: number }[]>([]);
  const [book, setBook] = useState<BookExcerpt>(BOOK_POOL[0]);
  const [eng, setEng] = useState<EnglishPassage>(ENGLISH_POOL[0]);
  const [ready, setReady] = useState(false);

  async function load() {
    const [map, dur, h] = await Promise.all([
      getTodayTaskMap(date),
      getTodayDuration(date),
      getHeatmap(7),
    ]);
    setTaskMap(map);
    setDuration(dur);
    setHeat(h);
    setReady(true);
  }

  useEffect(() => {
    load();
    setBook(pickDistinct(BOOK_POOL));
    setEng(pickDistinct(ENGLISH_POOL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(key: string, done: boolean) {
    setTaskMap((m) => ({ ...m, [key]: !done }));
    await setTodayTask(date, key, !done);
  }

  const now = new Date();

  return (
    <div className="space-y-5">
      {/* 顶部问候 */}
      <header className="pt-2">
        <p className="text-sm text-ink-faint">
          {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 · {weekdayCN(now)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">
          {greeting(now)}，今天也加油 🌱
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          慢慢来，比较快。先挑一件小事开始吧。
        </p>
      </header>

      {/* 今日成长：横向等分树苗条 */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-soft">今日成长</p>
            <span className="text-[11px] text-ink-faint">点按格子，记录今日完成</span>
          </div>
          <div className="flex overflow-hidden rounded-2xl border border-line bg-line/20">
            {GROWTH_MODULES.map((m, i) => {
              const done = !!taskMap[m.key];
              return (
                <button
                  key={m.key}
                  onClick={() => toggle(m.key, done)}
                  aria-label={m.label}
                  className={`flex h-[92px] flex-1 flex-col items-center justify-center gap-1.5 transition-colors duration-200 ${
                    i > 0 ? "border-l border-line" : ""
                  } ${done ? "bg-accent/15" : "bg-transparent hover:bg-line/40"}`}
                >
                  {done ? (
                    <Sprout className="h-7 w-7 text-accent" strokeWidth={2} />
                  ) : (
                    <span className="h-7 w-7" />
                  )}
                  <span
                    className={`whitespace-nowrap text-[10px] ${
                      done ? "text-accent-dark" : "text-ink-faint"
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI 推荐三卡片 */}
      <div className="space-y-1">
        <p className="px-1 text-sm font-medium text-ink-soft">今日为你推荐</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 书摘 */}
          <AICard
            icon={<BookOpen className="h-4 w-4" />}
            label="今日书摘"
            onRefresh={() => setBook((b) => pickDistinct(BOOK_POOL, b))}
          >
            <p className="font-medium text-ink">{book.book}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{book.author}</p>
            <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-ink-soft">
              {book.passage}
            </p>
          </AICard>

          {/* 英文 */}
          <AICard
            icon={<Languages className="h-4 w-4" />}
            label="今日英文"
            onRefresh={() => setEng((e) => pickDistinct(ENGLISH_POOL, e))}
          >
            <p className="font-medium text-ink">{eng.title}</p>
            <p className="mt-2 line-clamp-5 text-[13px] leading-relaxed text-ink-soft">
              {eng.en}
            </p>
            <p className="mt-1 text-[11px] text-ink-faint">↓ 点开英文阅读看全文翻译</p>
          </AICard>
        </div>
      </div>

      {/* 时长统计 */}
      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink-soft">今日专注时长</p>
              <p className="tabular text-2xl font-semibold text-ink">
                {duration}
                <span className="text-sm font-normal text-ink-faint"> 分钟</span>
              </p>
            </div>
          </div>
          <span className="text-xs text-ink-faint">运动·阅读·冥想·论文</span>
        </CardContent>
      </Card>

      {/* 热力图 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-ink-soft">近 7 天习惯</p>
          <div className="flex justify-between gap-2">
            {heat.map((h) => (
              <div key={h.date} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="h-10 w-full rounded-xl"
                  style={{ backgroundColor: heatColor(h.count, GROWTH_MODULES.length) }}
                  title={`${h.date}：${h.count} 项`}
                />
                <span className="text-[10px] text-ink-faint">
                  {Number(h.date.slice(5, 7))}/{h.date.slice(8)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!ready && <p className="py-6 text-center text-sm text-ink-faint">加载中…</p>}
    </div>
  );
}

function AICard({
  icon,
  label,
  onRefresh,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            {icon}
            {label}
          </span>
          <button
            onClick={onRefresh}
            aria-label="换一篇"
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
          >
            <RefreshCw className="h-3 w-3" /> 换一篇
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </CardContent>
    </Card>
  );
}
