"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Sprout,
  Bookmark,
  BookOpen,
  Languages,
  FlaskConical,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GROWTH_MODULES } from "@/lib/constants";
import { todayKey, greeting, weekdayCN } from "@/lib/utils";
import {
  getTodayTaskMap,
  setTodayTask,
  getTodayDuration,
  getHeatmap,
} from "@/lib/summary";
import { repos } from "@/lib/db/repo";
import type { FavoriteRecord } from "@/lib/db/db";

function heatColor(count: number, max: number): string {
  if (count <= 0) return "#EFC9D7";
  const a = 0.25 + 0.75 * (count / max);
  return `rgba(1,132,127,${a.toFixed(2)})`;
}

export default function TodayPage() {
  const date = useMemo(() => todayKey(), []);
  const [taskMap, setTaskMap] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState(0);
  const [heat, setHeat] = useState<{ date: string; count: number }[]>([]);
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);
  const [favOpen, setFavOpen] = useState(true);
  const [ready, setReady] = useState(false);

  async function load() {
    const [map, dur, h, fv] = await Promise.all([
      getTodayTaskMap(date),
      getTodayDuration(date),
      getHeatmap(7),
      repos.favorite.all(),
    ]);
    setTaskMap(map);
    setDuration(dur);
    setHeat(h);
    setFavs(fv);
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
            <p className="text-sm font-medium text-primary">今日成长</p>
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

      {/* 收藏夹（折叠面板） */}
      <Card>
        <CardContent>
          <button
            onClick={() => setFavOpen((o) => !o)}
            className="flex w-full items-center justify-between"
            aria-expanded={favOpen}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Bookmark className="h-4 w-4 text-accent" /> 收藏夹
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
            className="flex items-start justify-between gap-2 rounded-2xl bg-line/30 p-3"
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
