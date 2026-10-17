"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { Sheet } from "@/components/common/sheet";
import { repos } from "@/lib/db/repo";
import type { RecentBookRecord, SparkRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { getTodayTaskMap, setTodayTask } from "@/lib/summary";
import {
  normalizeRecentBookInput,
  sortRecentBooks,
  type RecentBookStatus,
} from "@/lib/recent-books-rules";

export default function ReadingPage() {
  const today = todayKey();
  const [sparkText, setSparkText] = useState("");
  const [sparks, setSparks] = useState<SparkRecord[]>([]);
  const [readToday, setReadToday] = useState(false);
  const [books, setBooks] = useState<RecentBookRecord[]>([]);
  const [bookTitle, setBookTitle] = useState("");
  const [editingBook, setEditingBook] = useState<RecentBookRecord>();
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<RecentBookStatus>("reading");
  const [bookMessage, setBookMessage] = useState("");
  const [bookSaving, setBookSaving] = useState(false);
  const [editBookSaving, setEditBookSaving] = useState(false);
  const bookSavingRef = useRef(false);
  const editBookSavingRef = useRef(false);

  async function refresh() {
    const [sp, tasks, recentBooks] = await Promise.all([
      repos.spark.all(),
      getTodayTaskMap(today),
      repos.recentBooks.all(),
    ]);
    setSparks(sp.sort((a, b) => b.createdAt - a.createdAt));
    setReadToday(!!tasks.reading);
    setBooks(sortRecentBooks(recentBooks));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSpark() {
    const text = sparkText.trim();
    if (!text) return;
    await repos.spark.add({ date: today, text, createdAt: Date.now() });
    setSparkText("");
    await bumpGrowthStep();
    await refresh();
  }

  async function deleteSpark(id?: number) {
    if (id == null) return;
    await repos.spark.delete(id);
    await refresh();
  }

  async function toggleReadToday() {
    const next = !readToday;
    setReadToday(next);
    await setTodayTask(today, "reading", next);
  }

  async function addBook() {
    if (!bookTitle.trim()) {
      setBookMessage("请先填写书名");
      return;
    }
    if (bookSavingRef.current) return;
    bookSavingRef.current = true;
    setBookSaving(true);
    setBookMessage("");
    try {
      const now = Date.now();
      const input = normalizeRecentBookInput(bookTitle, "", "reading", now);
      await repos.recentBooks.add({ ...input, createdAt: now });
      setBookTitle("");
      await refresh();
    } finally {
      bookSavingRef.current = false;
      setBookSaving(false);
    }
  }

  async function toggleBookStatus(book: RecentBookRecord) {
    if (book.id == null) return;
    await repos.recentBooks.update(book.id, {
      status: book.status === "reading" ? "finished" : "reading",
      updatedAt: Date.now(),
    });
    await refresh();
  }

  function openBookEdit(book: RecentBookRecord) {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditStatus(book.status);
  }

  async function saveBookEdit() {
    if (editingBook?.id == null || !editTitle.trim() || editBookSavingRef.current) return;
    editBookSavingRef.current = true;
    setEditBookSaving(true);
    try {
      const patch = normalizeRecentBookInput(editTitle, editingBook.note ?? "", editStatus);
      await repos.recentBooks.update(editingBook.id, patch);
      setEditingBook(undefined);
      await refresh();
    } finally {
      editBookSavingRef.current = false;
      setEditBookSaving(false);
    }
  }

  async function deleteBook(id?: number) {
    if (id == null) return;
    await repos.recentBooks.delete(id);
    if (editingBook?.id === id) setEditingBook(undefined);
    await refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="阅读" desc="留一点安静的时间，记录读过的内容与想法" />

      <button
        type="button"
        onClick={toggleReadToday}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
          readToday ? "border-[#DCE7E1] bg-[#EDF2EF]" : "border-line bg-card"
        }`}
      >
        <span>
          <span className="block text-sm font-medium text-ink">今日已阅读</span>
          <span className="mt-0.5 block text-xs text-ink-faint">
            {readToday ? "今天已经留过阅读时间" : "点击标记今天已阅读"}
          </span>
        </span>
        <CheckCircle2 className={`h-5 w-5 ${readToday ? "text-[#5E7C6C]" : "text-ink-faint"}`} />
      </button>

      <section className="border-y border-line py-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" /> 最近在读
        </div>
        <Input
          value={bookTitle}
          onChange={(event) => {
            setBookTitle(event.target.value);
            if (bookMessage) setBookMessage("");
          }}
          onEnterSubmit={addBook}
          enterKeyHint="done"
          placeholder="输入书名……"
          maxLength={120}
        />
        {bookMessage && <p className="mt-1.5 text-xs text-ink-soft" role="status">{bookMessage}</p>}
        <Button variant="soft" size="sm" className="mt-2 w-full" onClick={addBook} disabled={!bookTitle.trim() || bookSaving}>
          <Plus className="h-4 w-4" /> {bookSaving ? "添加中…" : "添加到最近在读"}
        </Button>

        {books.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-faint">还没有书籍记录</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {books.map((book) => (
              <li
                key={book.id}
                className={`flex items-start justify-between gap-3 rounded-lg px-2 py-3 first:pt-2 last:pb-2 ${book.status === "reading" ? "bg-[#FFF6D9]" : "bg-[#E7F0FA]"}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{book.title}</p>
                  {book.note && <p className="mt-0.5 text-xs text-ink-faint">{book.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleBookStatus(book)}
                    aria-pressed={book.status === "reading"}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${book.status === "reading" ? "border-[#D8B84C] bg-[#F8E9A8] text-[#806B20]" : "border-line bg-white/70 text-ink-soft"}`}
                  >
                    在读
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (book.status === "reading") toggleBookStatus(book);
                    }}
                    aria-pressed={book.status === "finished"}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${book.status === "finished" ? "border-primary/30 bg-[#C9DDF2] text-primary" : "border-line bg-white/70 text-ink-soft"}`}
                  >
                    读完
                  </button>
                  <button onClick={() => openBookEdit(book)} aria-label={`修改${book.title}`} className="p-1.5 text-ink-faint hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteBook(book.id)} aria-label={`删除${book.title}`} className="p-1.5 text-ink-faint hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" /> 灵光一闪
          </div>
          <p className="mb-2 text-[13px] text-ink-faint">随时记下脑子里蹦出的小灵感</p>
          <Textarea
            value={sparkText}
            onChange={(event) => setSparkText(event.target.value)}
            placeholder="比如：一个突然想到的研究角度…"
            rows={3}
          />
          <Button variant="soft" className="mt-3 w-full" onClick={saveSpark} disabled={!sparkText.trim()}>
            记下来
          </Button>

          {sparks.length > 0 && (
            <FoldList
              className="mt-4"
              items={sparks}
              title={<p className="text-xs font-medium text-primary">我的灵感（{sparks.length}）</p>}
              renderItem={(spark) => (
                <div key={spark.id} className="flex items-start justify-between gap-2 rounded-xl bg-line/30 p-3">
                  <div className="min-w-0">
                    <p className="text-[13px] leading-relaxed text-ink">{spark.text}</p>
                    <p className="tabular mt-1 text-[11px] text-ink-faint">{spark.date}</p>
                  </div>
                  <button
                    onClick={() => deleteSpark(spark.id)}
                    aria-label="删除灵感"
                    className="shrink-0 text-ink-faint transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editingBook} onClose={() => setEditingBook(undefined)} title="修改书籍">
        <div className="space-y-4">
          <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onEnterSubmit={saveBookEdit} enterKeyHint="done" placeholder="书名" maxLength={120} />
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F2F2F0] p-1">
            {(["reading", "finished"] as RecentBookStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setEditStatus(status)}
                className={`h-9 rounded-md text-xs font-medium ${editStatus === status ? "bg-white text-primary" : "text-ink-soft"}`}
              >
                {status === "reading" ? "在读" : "读完"}
              </button>
            ))}
          </div>
          <Button variant="accent" className="w-full" onClick={saveBookEdit} disabled={!editTitle.trim() || editBookSaving}>
            {editBookSaving ? "保存中…" : "保存修改"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
