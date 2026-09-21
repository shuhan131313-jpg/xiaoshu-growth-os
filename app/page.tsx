"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Bookmark,
  BookOpen,
  Languages,
  Dumbbell,
  PenLine,
  Heart,
  FlaskConical,
  ChevronDown,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { GROWTH_MODULES, TODAY_MODULES } from "@/lib/constants";
import { todayKey, greeting, weekdayCN } from "@/lib/utils";
import {
  getTodayTaskMap,
  setTodayTask,
  getTodayDuration,
  getHeatmap,
} from "@/lib/summary";
import { getGrowthStep } from "@/lib/growth";
import { repos } from "@/lib/db/repo";
import type { FavoriteRecord } from "@/lib/db/db";

/** 自动打卡模块：完成对应操作后由数据驱动点亮，无需首页手动点选（阅读除外） */
const AUTO_KEYS = new Set(["exercise", "english", "research", "experiment", "gratitude"]);

function heatColor(count: number, max: number): string {
  if (count <= 0) return "#E2E5EC";
  const a = 0.25 + 0.75 * (count / max);
  return `rgba(26,63,144,${a.toFixed(2)})`;
}

export default function TodayPage() {
  const date = useMemo(() => todayKey(), []);
  const [taskMap, setTaskMap] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState(0);
  const [heat, setHeat] = useState<{ date: string; count: number }[]>([]);
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);
  const [favOpen, setFavOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [exCount, setExCount] = useState(0);
  const [rsCount, setRsCount] = useState(0);
  const [expCount, setExpCount] = useState(0);
  const [gratitudeCount, setGratitudeCount] = useState(0);
  const [ready, setReady] = useState(false);

  async function load() {
    const [map, dur, h, fv, gstep, ex, rs, exp, gratitude] = await Promise.all([
      getTodayTaskMap(date),
      getTodayDuration(date),
      getHeatmap(7),
      repos.favorite.all(),
      getGrowthStep(),
      repos.exercise.whereDate(date),
      repos.research.whereDate(date),
      repos.experiment.whereDate(date),
      repos.gratitude.whereDate(date),
    ]);
    setTaskMap(map);
    setDuration(dur);
    setHeat(h);
    setFavs(fv);
    setStep(gstep);
    setExCount(ex.length);
    setRsCount(rs.length);
    setExpCount(exp.length);
    setGratitudeCount(gratitude.length);
    setReady(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(key: string, done: boolean) {
    setTaskMap((m) => ({ ...m, [key]: !done }));
    await setTodayTask(date, key, !done);
  }

  async function removeFav(id?: number) {
    if (id == null) return;
    await repos.favorite.delete(id);
    setFavs(await repos.favorite.all());
  }

  const now = new Date();
  const bookFavs = favs.filter((f) => f.type === "book");
  const englishFavs = favs.filter((f) => f.type === "english");
  const paperFavs = favs.filter((f) => f.type === "paper");
  const moduleStatus: Record<string, boolean> = {
    exercise: exCount > 0,
    reading: !!taskMap.reading,
    english: !!taskMap.english,
    research: rsCount > 0,
    experiment: expCount > 0,
    gratitude: gratitudeCount > 0,
  };
  const completed = TODAY_MODULES.filter((item) => moduleStatus[item.key]).length;
  const moduleHref: Record<string, string> = {
    exercise: "/exercise",
    reading: "/reading",
    english: "/english",
    research: "/research",
    experiment: "/experiment",
    gratitude: "/gratitude",
  };
  const moduleIcon = {
    exercise: Dumbbell,
    reading: BookOpen,
    english: Languages,
    research: PenLine,
    experiment: FlaskConical,
    gratitude: Heart,
  };

  return (
    <div className="space-y-8">
      {/* 顶部问候 */}
      <header className="pt-1">
        <p className="tabular text-sm tracking-wide text-ink-faint">
          {now.getMonth() + 1}.{now.getDate()} · {weekdayCN(now)}
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em] text-ink">
          {greeting(now)}，树。
        </h1>
      </header>

      <section className="rounded-xl bg-primary px-5 py-5 text-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/65">成长积分</p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{step}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/65">今日进度</p>
            <p className="tabular mt-1 text-xl font-medium">{completed} / {TODAY_MODULES.length}</p>
          </div>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${(completed / TODAY_MODULES.length) * 100}%` }} />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">今日进度</h2>
          <span className="text-xs text-ink-faint">阅读可手动标记完成</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TODAY_MODULES.map((item) => {
            const done = moduleStatus[item.key];
            const auto = AUTO_KEYS.has(item.key);
            const Icon = moduleIcon[item.key];
            return (
              <div key={item.key} className={`flex min-h-[92px] flex-col rounded-lg border px-2.5 py-2.5 ${done ? "border-[#DCE7E1] bg-[#EDF2EF]" : "border-line bg-[#F2F2F0]"}`}>
                <Link href={moduleHref[item.key]} className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <Icon className={done ? "h-4 w-4 text-primary" : "h-4 w-4 text-ink-faint"} strokeWidth={1.8} />
                    {done ? <CheckCircle2 className="h-4 w-4 text-[#5E7C6C]" /> : <Circle className="h-4 w-4 text-ink-faint" strokeWidth={1.4} />}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-tight text-ink">{item.label}</p>
                </Link>
                {auto ? (
                  <span className={`mt-1 text-[10px] ${done ? "text-[#5E7C6C]" : "text-ink-faint"}`}>{done ? "已完成" : "未记录"}</span>
                ) : (
                  <button type="button" onClick={() => toggle(item.key, done)} className={`mt-1 self-start text-[10px] ${done ? "text-[#5E7C6C]" : "text-primary"}`}>
                    {done ? "已完成 · 取消" : "标记完成"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 收藏夹（折叠面板） */}
      <Card>
        <CardContent>
          <button
            onClick={() => setFavOpen((o) => !o)}
            className="flex w-full items-center justify-between"
            aria-expanded={favOpen}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Bookmark className="h-4 w-4 text-gold" /> 收藏夹
              <span className="text-[11px] text-ink-faint">
                {favs.length}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 text-ink-faint transition-transform duration-200 ${
                favOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {favOpen && (
            <div className="mt-4 space-y-5">
              {favs.length === 0 ? (
                <p className="py-2 text-center text-sm text-ink-faint">
                  还没有收藏内容，去书摘 / 英文 / 文献页点收藏吧 🔖
                </p>
              ) : (
                <>
                  {bookFavs.length > 0 && (
                    <FavGroup
                      icon={<BookOpen className="h-3.5 w-3.5" />}
                      title="书摘收藏"
                      items={bookFavs}
                      onDelete={removeFav}
                    />
                  )}
                  {englishFavs.length > 0 && (
                    <FavGroup
                      icon={<Languages className="h-3.5 w-3.5" />}
                      title="英文收藏"
                      items={englishFavs}
                      onDelete={removeFav}
                    />
                  )}
                  {paperFavs.length > 0 && (
                    <FavGroup
                      icon={<FlaskConical className="h-3.5 w-3.5" />}
                      title="文献收藏"
                      items={paperFavs}
                      onDelete={removeFav}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 时长统计 */}
      <Card className="border-0 bg-[#EDF1F5] shadow-none">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
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
          <span className="text-xs text-ink-faint">运动·阅读·论文</span>
        </CardContent>
      </Card>

      {/* 热力图 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-primary">近 7 天习惯</p>
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

function FavGroup({
  icon,
  title,
  items,
  onDelete,
}: {
  icon: React.ReactNode;
  title: string;
  items: FavoriteRecord[];
  onDelete: (id?: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
        {icon} {title}
        <span className="text-[11px] text-ink-faint">（{items.length}）</span>
      </p>
      <ul className="space-y-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-start justify-between gap-2 rounded-xl bg-line/30 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{f.title}</p>
              {f.author && (
                <p className="mt-0.5 text-xs text-ink-faint">{f.author}</p>
              )}
              {f.excerpt && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                  {f.excerpt}
                </p>
              )}
            </div>
            <button
              onClick={() => onDelete(f.id)}
              aria-label="删除收藏"
              className="shrink-0 text-ink-faint transition duration-200 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
