"use client";

import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, Sparkles, Trash2, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ReadingRecord, SparkRecord, FavoriteRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { BOOK_POOL, pickDistinct, type BookExcerpt } from "@/lib/ai/content";

export default function ReadingPage() {
  const today = todayKey();
  const [book, setBook] = useState<BookExcerpt>(BOOK_POOL[0]);
  const [feeling, setFeeling] = useState("");
  const [history, setHistory] = useState<ReadingRecord[]>([]);
  const [sparkText, setSparkText] = useState("");
  const [sparks, setSparks] = useState<SparkRecord[]>([]);
  const [favs, setFavs] = useState<FavoriteRecord[]>([]);

  const bookKey = `book:${book.book}`;
  const bookFav = favs.some((f) => f.type === "book" && f.key === bookKey);

  async function refresh() {
    const [all, sp, fv] = await Promise.all([
      repos.reading.all(),
      repos.spark.all(),
      repos.favorite.all(),
    ]);
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
    setSparks(sp.sort((a, b) => b.createdAt - a.createdAt));
    setFavs(fv);
  }

  useEffect(() => {
    refresh();
    setBook(pickDistinct(BOOK_POOL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveFeeling() {
    if (!feeling.trim()) return;
    await repos.reading.add({
      date: today,
      book: book.book,
      duration: 0,
      feeling: feeling.trim(),
      createdAt: Date.now(),
    });
    setFeeling("");
    refresh();
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

  async function deleteHistory(id: number) {
    await repos.reading.delete(id);
    refresh();
  }

  async function toggleBookFav() {
    if (bookFav) {
      const ex = favs.find((f) => f.type === "book" && f.key === bookKey);
      if (ex?.id) await repos.favorite.delete(ex.id);
    } else {
      await repos.favorite.add({
        type: "book",
        key: bookKey,
        title: book.book,
        author: book.author,
        excerpt: book.passage,
        date: today,
        createdAt: Date.now(),
      });
    }
    await refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="阅读" desc="每天留一段安静的时间，与自己对话" />

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

      {/* 每日书摘（独立区块 + 收藏） */}
      <Card>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <BookOpen className="h-4 w-4" /> 每日书摘
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBook((b) => pickDistinct(BOOK_POOL, b))}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ink-faint hover:bg-line/50"
              >
                <RefreshCw className="h-3 w-3" /> 换一本
              </button>
              <button
                onClick={toggleBookFav}
                aria-label={bookFav ? "取消收藏" : "收藏书摘"}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] transition duration-200 hover:bg-line/50"
              >
                <Bookmark
                  className={`h-4 w-4 ${
                    bookFav ? "fill-accent text-accent" : "text-ink-faint"
                  }`}
                />
              </button>
            </div>
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

      {/* 阅读感想（独立区块） */}
      <Card>
        <CardContent>
          <Label>阅读感想（随手记录，随时保存）</Label>
          <Textarea
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="这一段让我想到…"
            rows={3}
          />
          <Button
            variant="soft"
            className="mt-3 w-full"
            onClick={saveFeeling}
            disabled={!feeling.trim()}
          >
            保存感想
          </Button>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-sm font-medium text-ink">
                          {r.date}
                        </span>
                        {r.duration > 0 && (
                          <span className="tabular text-xs text-ink-faint">
                            {r.duration} 分钟
                          </span>
                        )}
                      </div>
                      {r.book && (
                        <p className="mt-1 text-sm text-ink-soft">📖 {r.book}</p>
                      )}
                      {r.feeling && (
                        <p className="mt-1 text-[13px] text-ink-soft">{r.feeling}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteHistory(r.id!)}
                      aria-label="删除记录"
                      className="shrink-0 text-ink-faint transition duration-200 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
