"use client";

import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, Check, Clock, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/common/timer";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ReadingRecord, SparkRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { BOOK_POOL, pickDistinct, type BookExcerpt } from "@/lib/ai/content";

const GOALS = [20, 30, 45, 60];

export default function ReadingPage() {
  const today = todayKey();
  const [book, setBook] = useState<BookExcerpt>(BOOK_POOL[0]);
  const [goal, setGoal] = useState(30);
  const [timerKey, setTimerKey] = useState(0);
  const [feeling, setFeeling] = useState("");
  const [history, setHistory] = useState<ReadingRecord[]>([]);
  const [saved, setSaved] = useState(false);
  const [sparkText, setSparkText] = useState("");
  const [sparks, setSparks] = useState<SparkRecord[]>([]);

  async function refresh() {
    const [all, sp] = await Promise.all([
      repos.reading.all(),
      repos.spark.all(),
    ]);
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    setSparks(sp.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    setBook(pickDistinct(BOOK_POOL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSession(elapsedSec: number) {
    const dur = Math.max(1, Math.round(elapsedSec / 60));
    await repos.reading.add({
      date: today,
      book: book.book,
      duration: dur,
      feeling: feeling.trim() || undefined,
      createdAt: Date.now(),
    });
    setFeeling("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }

  function pickGoal(g: number) {
    setGoal(g);
    setTimerKey((k) => k + 1);
  }

  async function saveSpark() {
    const t = sparkText.trim();
    if (!t) return;
    await repos.spark.add({ date: today, text: t, createdAt: Date.now() });
    setSparkText("");
    refresh();
  }

  async function deleteSpark(id: number) {
    await repos.spark.delete(id);
    refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="阅读" desc="每天留一段安静的时间，与自己对话" />

      {/* 每日书摘 */}
      <Card>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <BookOpen className="h-4 w-4" /> 每日书摘
            </span>
            <button
              onClick={() => setBook((b) => pickDistinct(BOOK_POOL, b))}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
            >
              <RefreshCw className="h-3 w-3" /> 换一本
            </button>
          </div>
          <p className="font-semibold text-ink">{book.book}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{book.author}</p>
          {book.region && (
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {book.region}
              {book.tag ? ` · ${book.tag}` : ""}
            </span>
          )}
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {book.intro}
          </p>
          <p className="mt-3 rounded-2xl bg-line/30 p-3 text-[14px] leading-relaxed text-ink">
            {book.passage}
          </p>
        </CardContent>
      </Card>

      {/* 计时器 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Clock className="h-4 w-4 text-accent" /> 阅读计时
          </div>
          <div className="flex justify-center gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => pickGoal(g)}
                className={`h-9 rounded-2xl px-3 text-[13px] font-medium transition duration-200 ${
                  goal === g
                    ? "bg-primary text-white shadow-soft"
                    : "bg-line/40 text-ink-soft hover:bg-line/70"
                }`}
              >
                {g} 分
              </button>
            ))}
          </div>
          <Timer
            key={timerKey}
            mode="countdown"
            targetSeconds={goal * 60}
            goalLabel={`目标 ${goal} 分钟`}
            onComplete={saveSession}
            onStop={saveSession}
          />
          {saved && (
            <p className="flex items-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已记录本次阅读（{book.book}）
            </p>
          )}
        </CardContent>
      </Card>

      {/* 感想 */}
      <Card>
        <CardContent>
          <Label>阅读感想（结束后随计时一起保存，也可单独记录）</Label>
          <Textarea
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="这一段让我想到…"
            rows={3}
          />
          <Button
            variant="soft"
            className="mt-3 w-full"
            onClick={() => saveSession(goal * 60)}
            disabled={!feeling.trim()}
          >
            仅保存感想
          </Button>
        </CardContent>
      </Card>

      {/* 灵光一闪 */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" /> 灵光一闪
          </div>
          <p className="mb-2 text-[13px] text-ink-faint">
            随时记下脑子里蹦出的小灵感
          </p>
          <Textarea
            value={sparkText}
            onChange={(e) => setSparkText(e.target.value)}
            placeholder="比如：一个突然想到的研究角度…"
            rows={3}
          />
          <Button
            variant="soft"
            className="mt-3 w-full"
            onClick={saveSpark}
            disabled={!sparkText.trim()}
          >
            记下来
          </Button>

          {sparks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-ink-soft">
                我的灵感（{sparks.length}）
              </p>
              {sparks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-2 rounded-2xl bg-line/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] leading-relaxed text-ink">{s.text}</p>
                    <p className="mt-1 tabular text-[11px] text-ink-faint">{s.date}</p>
                  </div>
                  <button
                    onClick={() => deleteSpark(s.id!)}
                    aria-label="删除灵感"
                    className="shrink-0 text-ink-faint transition duration-200 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 历史 */}
      <div>
        <p className="mb-3 px-1 text-sm font-medium text-ink-soft">阅读历史</p>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-faint">
              还没有阅读记录
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <Card key={r.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="tabular text-sm font-medium text-ink">
                      {r.date}
                    </span>
                    <span className="tabular text-xs text-ink-faint">
                      {r.duration} 分钟
                    </span>
                  </div>
                  {r.book && (
                    <p className="mt-1 text-sm text-ink-soft">📖 {r.book}</p>
                  )}
                  {r.feeling && (
                    <p className="mt-1 text-[13px] text-ink-soft">{r.feeling}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
