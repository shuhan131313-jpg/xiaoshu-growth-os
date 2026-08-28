"use client";

import { useEffect, useState } from "react";
import { Languages, RefreshCw, Bookmark, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { FavoriteRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import {
  ENGLISH_POOL,
  pickDistinct,
  type EnglishPassage,
} from "@/lib/ai/content";
import { getDailyPick, setDailyPick, bumpGrowthStep } from "@/lib/growth";
import { getTodayTaskMap, setTodayTask } from "@/lib/summary";

export default function EnglishPage() {
  const today = todayKey();
  const [p, setP] = useState<EnglishPassage>(ENGLISH_POOL[0]);
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);
  const [engDone, setEngDone] = useState(false);

  const engKey = `english:${p.title}`;
  const engFav = favs.some((f) => f.type === "english" && f.key === engKey);

  useEffect(() => {
    (async () => {
      const saved = await getDailyPick<EnglishPassage>(
        "english",
        ENGLISH_POOL,
        (item, v) => item.title === v,
        ENGLISH_POOL[0]
      );
      setP(saved);
      const map = await getTodayTaskMap(today);
      setEngDone(!!map.english);
    })();
    repos.favorite.all().then(setFavs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changePassage() {
    const next = pickDistinct(ENGLISH_POOL, p);
    setP(next);
    await setDailyPick("english", next.title);
  }

  async function checkIn() {
    if (engDone) return;
    await setTodayTask(today, "english", true);
    setEngDone(true);
    await bumpGrowthStep();
  }

  async function toggleFav() {
    if (engFav) {
      const ex = favs.find((f) => f.type === "english" && f.key === engKey);
      if (ex?.id) await repos.favorite.delete(ex.id);
    } else {
      await repos.favorite.add({
        type: "english",
        key: engKey,
        title: p.title,
        excerpt: p.en,
        zh: p.zh,
        date: today,
        createdAt: Date.now(),
      });
      await bumpGrowthStep();
    }
    setFavs(await repos.favorite.all());
  }

  return (
    <div className="space-y-5">
      <PageHeader title="英文阅读" desc="每天一篇 CET6 难度短文，潜移默化提升语感" />

      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Languages className="h-4 w-4" /> {p.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={changePassage}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
          >
            <RefreshCw className="h-3 w-3" /> 换一篇
          </button>
          <button
            onClick={toggleFav}
            aria-label={engFav ? "取消收藏" : "收藏"}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] transition duration-200 hover:bg-line/50"
          >
            <Bookmark
              className={`h-4 w-4 ${
                engFav ? "fill-gold text-gold" : "text-ink-faint"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 原文 */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-primary">英文原文</p>
          <p className="text-[15px] leading-8 text-ink">{p.en}</p>
        </CardContent>
      </Card>

      {/* 翻译 */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-primary">中文翻译</p>
          <p className="text-[14px] leading-7 text-ink-soft">{p.zh}</p>
        </CardContent>
      </Card>

      {/* 重点词汇 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-primary">重点词汇</p>
          <div className="flex flex-wrap gap-2">
            {p.vocab.map((v) => (
              <div
                key={v.word}
                className="rounded-2xl bg-line/30 px-3 py-2 text-[13px]"
              >
                <span className="font-medium text-primary">{v.word}</span>
                <span className="ml-2 text-ink-soft">{v.meaning}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 长难句 */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-primary">长难句解析</p>
          <p className="text-[14px] leading-7 text-ink">{p.longSentence.en}</p>
          <p className="mt-2 rounded-2xl bg-accent/10 p-3 text-[13px] leading-7 text-ink-soft">
            {p.longSentence.zh}
          </p>
        </CardContent>
      </Card>

      {/* 短语 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-primary">实用短语</p>
          <div className="space-y-2">
            {p.phrases.map((ph) => (
              <div key={ph.phrase} className="flex items-baseline gap-3">
                <Badge className="shrink-0 bg-gold/15 text-gold-dark">
                  {ph.phrase}
                </Badge>
                <span className="text-[13px] text-ink-soft">{ph.meaning}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant={engDone ? "soft" : "accent"}
        className="w-full"
        onClick={checkIn}
        disabled={engDone}
      >
        <Check className={engDone ? "h-4 w-4" : "h-4 w-4"} />
        {engDone ? "今日已打卡 ✓" : "完成打卡"}
      </Button>

      <Button
        variant={engFav ? "soft" : "accent"}
        className="w-full"
        onClick={toggleFav}
      >
        <Bookmark
          className={engFav ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4"}
        />
        {engFav ? "已收藏" : "收藏此篇"}
      </Button>
    </div>
  );
}
