"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Dumbbell,
  Flame,
  Heart,
  PenLine,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { GROWTH_MODULES } from "@/lib/constants";
import { todayKey, greeting, weekdayCN } from "@/lib/utils";
import { getTodayTaskMap, getTodayDuration, getHeatmap, setTodayTask } from "@/lib/summary";
import { repos } from "@/lib/db/repo";
import type { DailyMainRecord } from "@/lib/db/db";
import { getDailyMain } from "@/lib/mainline";
import { MainlineSheet } from "@/components/mainline/mainline-sheet";

const PROGRESS_SLOTS = ["exercise", "reading", null, "research", null, "gratitude"] as const;
type ProgressKey = Exclude<(typeof PROGRESS_SLOTS)[number], null>;
const AUTO_KEYS = new Set<ProgressKey>(["exercise", "research", "gratitude"]);

const MODULES: Record<ProgressKey, {
  label: string;
  href: string;
  icon: typeof Dumbbell;
}> = {
  exercise: { label: "运动", href: "/exercise", icon: Dumbbell },
  reading: { label: "阅读", href: "/reading", icon: BookOpen },
  research: { label: "专注", href: "/research", icon: PenLine },
  gratitude: { label: "感恩日记", href: "/gratitude", icon: Heart },
};

function heatColor(count: number, max: number): string {
  if (count <= 0) return "#E2E5EC";
  const alpha = 0.25 + 0.75 * (count / max);
  return `rgba(26,63,144,${alpha.toFixed(2)})`;
}

export default function TodayPage() {
  const date = useMemo(() => todayKey(), []);
  const [taskMap, setTaskMap] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState(0);
  const [heat, setHeat] = useState<{ date: string; count: number }[]>([]);
  const [exCount, setExCount] = useState(0);
  const [rsCount, setRsCount] = useState(0);
  const [gratitudeCount, setGratitudeCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [mainline, setMainline] = useState<DailyMainRecord>();
  const [mainlineOpen, setMainlineOpen] = useState(false);
  const [foodSummary, setFoodSummary] = useState({ total: 0, unplanned: 0 });

  async function load() {
    const [map, dur, heatmap, exercise, research, gratitude, dailyMain, foodRecords] = await Promise.all([
      getTodayTaskMap(date),
      getTodayDuration(date),
      getHeatmap(7),
      repos.exercise.whereDate(date),
      repos.research.whereDate(date),
      repos.gratitude.whereDate(date),
      getDailyMain(date),
      repos.foodRecords.whereDate(date),
    ]);
    setTaskMap(map);
    setDuration(dur);
    setHeat(heatmap);
    setExCount(exercise.length);
    setRsCount(research.length);
    setGratitudeCount(gratitude.length);
    setMainline(dailyMain);
    setFoodSummary({
      total: foodRecords.length,
      unplanned: foodRecords.filter((record) => record.isUnplanned).length,
    });
    setReady(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReading(done: boolean) {
    const next = !done;
    setTaskMap((current) => ({ ...current, reading: next }));
    await setTodayTask(date, "reading", next);
  }

  const now = new Date();
  const moduleStatus: Record<ProgressKey, boolean> = {
    exercise: exCount > 0,
    reading: !!taskMap.reading,
    research: rsCount > 0,
    gratitude: gratitudeCount > 0,
  };

  return (
    <div className="space-y-8">
      <header className="pt-1">
        <p className="tabular text-sm tracking-wide text-ink-faint">
          {now.getMonth() + 1}.{now.getDate()} · {weekdayCN(now)}
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em] text-ink">
          {greeting(now)}，树。
        </h1>
        <button
          type="button"
          onClick={() => setMainlineOpen(true)}
          className="mt-6 flex w-full items-center justify-between border-y border-line py-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
              Today&apos;s Main
            </span>
            {mainline ? (
              <>
                <span className="mt-1 block text-lg font-semibold text-ink">{mainline.category}</span>
                {mainline.note && <span className="mt-0.5 block truncate text-sm text-ink-soft">{mainline.note}</span>}
              </>
            ) : (
              <span className="mt-1 block text-base font-medium text-ink">今天的主线是什么？</span>
            )}
          </span>
          <span className="ml-4 flex shrink-0 items-center gap-0.5 text-xs text-primary">
            {mainline ? "修改" : "选择主线"}<ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </header>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">今日进度</h2>
          <span className="text-xs text-ink-faint">阅读可手动标记完成</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PROGRESS_SLOTS.map((key, index) => {
            if (key == null) {
              return <div key={`empty-${index}`} aria-hidden="true" className="min-h-[92px]" />;
            }
            const module = MODULES[key];
            const done = moduleStatus[key];
            const auto = AUTO_KEYS.has(key);
            const Icon = module.icon;
            return (
              <div key={key} className={`flex min-h-[92px] flex-col rounded-lg border px-2.5 py-2.5 ${done ? "border-[#DCE7E1] bg-[#EDF2EF]" : "border-line bg-[#F2F2F0]"}`}>
                <Link href={module.href} className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <Icon className={done ? "h-4 w-4 text-primary" : "h-4 w-4 text-ink-faint"} strokeWidth={1.8} />
                    {done ? <CheckCircle2 className="h-4 w-4 text-[#5E7C6C]" /> : <Circle className="h-4 w-4 text-ink-faint" strokeWidth={1.4} />}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-tight text-ink">{module.label}</p>
                </Link>
                {auto ? (
                  <span className={`mt-1 text-[10px] ${done ? "text-[#5E7C6C]" : "text-ink-faint"}`}>
                    {done ? "已完成" : "未记录"}
                  </span>
                ) : (
                  <button type="button" onClick={() => toggleReading(done)} className={`mt-1 w-full text-left text-[10px] ${done ? "text-[#5E7C6C]" : "text-primary"}`}>
                    {done ? "已完成 · 取消" : "标记完成"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Link href="/food" className="flex items-center justify-between border-y border-line py-3.5 text-left transition hover:border-primary/30">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Utensils className="h-4 w-4 text-primary" strokeWidth={1.8} /> 今日饮食
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-faint">
          {foodSummary.total > 0 ? `已记录 ${foodSummary.total} 次 · 计划外 ${foodSummary.unplanned} 次` : "还没有记录"}
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>

      <Card className="border-0 bg-[#EDF1F5] shadow-none">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink-soft">今日专注时长</p>
              <p className="tabular text-2xl font-semibold text-ink">
                {duration}<span className="text-sm font-normal text-ink-faint"> 分钟</span>
              </p>
            </div>
          </div>
          <span className="text-xs text-ink-faint">运动·阅读·专注</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-primary">近 7 天习惯</p>
          <div className="flex justify-between gap-2">
            {heat.map((item) => (
              <div key={item.date} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="h-10 w-full rounded-xl"
                  style={{ backgroundColor: heatColor(item.count, GROWTH_MODULES.length) }}
                  title={`${item.date}：${item.count} 项`}
                />
                <span className="text-[10px] text-ink-faint">{Number(item.date.slice(5, 7))}/{item.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!ready && <p className="py-6 text-center text-sm text-ink-faint">加载中…</p>}

      <MainlineSheet
        open={mainlineOpen}
        date={date}
        existing={mainline}
        onClose={() => setMainlineOpen(false)}
        onSaved={setMainline}
      />
    </div>
  );
}
