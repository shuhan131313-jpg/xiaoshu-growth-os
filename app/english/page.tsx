"use client";

import { useEffect, useState } from "react";
import { Languages, RefreshCw, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import { todayKey } from "@/lib/utils";
import {
  ENGLISH_POOL,
  pickDistinct,
  type EnglishPassage,
} from "@/lib/ai/content";

export default function EnglishPage() {
  const today = todayKey();
  const [p, setP] = useState<EnglishPassage>(ENGLISH_POOL[0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setP(pickDistinct(ENGLISH_POOL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveToStudy() {
    await repos.english.add({
      date: today,
      title: p.title,
      content: p.en,
      createdAt: Date.now(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="英文阅读" desc="每天一篇 CET6 难度短文，潜移默化提升语感" />

      <div className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Languages className="h-4 w-4" /> {p.title}
        </span>
        <button
          onClick={() => setP((x) => pickDistinct(ENGLISH_POOL, x))}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
        >
          <RefreshCw className="h-3 w-3" /> 换一篇
        </button>
      </div>

      {/* 原文 */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-ink-soft">英文原文</p>
          <p className="text-[15px] leading-8 text-ink">{p.en}</p>
        </CardContent>
      </Card>

      {/* 翻译 */}
      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-ink-soft">中文翻译</p>
          <p className="text-[14px] leading-7 text-ink-soft">{p.zh}</p>
        </CardContent>
      </Card>

      {/* 重点词汇 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-ink-soft">重点词汇</p>
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
          <p className="mb-2 text-sm font-medium text-ink-soft">长难句解析</p>
          <p className="text-[14px] leading-7 text-ink">{p.longSentence.en}</p>
          <p className="mt-2 rounded-2xl bg-accent/10 p-3 text-[13px] leading-7 text-ink-soft">
            {p.longSentence.zh}
          </p>
        </CardContent>
      </Card>

      {/* 短语 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-ink-soft">实用短语</p>
          <div className="space-y-2">
            {p.phrases.map((ph) => (
              <div key={ph.phrase} className="flex items-baseline gap-3">
                <Badge className="shrink-0 bg-accent/15 text-accent-dark">
                  {ph.phrase}
                </Badge>
                <span className="text-[13px] text-ink-soft">{ph.meaning}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="soft"
        className="w-full"
        onClick={saveToStudy}
        disabled={saved}
      >
        <Bookmark className="h-4 w-4" />
        {saved ? "已加入我的学习" : "保存到我的学习"}
      </Button>
    </div>
  );
}
