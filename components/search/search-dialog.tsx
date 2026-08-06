"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db/db";

interface Hit {
  module: string;
  date: string;
  text: string;
}

const MODULE_LABEL: Record<string, string> = {
  exercise: "运动",
  reading: "阅读",
  research: "论文",
  literature: "文献",
  experiment: "实验",
  gratitude: "感恩",
  english: "英文",
  spark: "灵光",
};

async function collectAll(): Promise<Hit[]> {
  const [ex, rd, rs, lit, exp, gr, en, sp] = await Promise.all([
    db.exercise.toArray(),
    db.reading.toArray(),
    db.research.toArray(),
    db.literature.toArray(),
    db.experiment.toArray(),
    db.gratitude.toArray(),
    db.english.toArray(),
    db.spark.toArray(),
  ]);
  const hits: Hit[] = [];
  for (const r of ex)
    hits.push({ module: "exercise", date: r.date, text: `${r.project} ${r.note ?? ""}` });
  for (const r of rd)
    hits.push({ module: "reading", date: r.date, text: `${r.book ?? ""} ${r.feeling ?? ""}` });
  for (const r of rs)
    hits.push({ module: "research", date: r.date, text: r.summary ?? "论文写作" });
  for (const r of lit)
    hits.push({ module: "literature", date: r.date, text: `${r.title} ${r.cnSummary}` });
  for (const r of exp)
    hits.push({
      module: "experiment",
      date: r.date,
      text: `${r.name ?? ""} ${r.note ?? ""} ${r.steps ?? ""} ${r.result ?? ""} ${r.improvement ?? ""}`,
    });
  for (const r of gr)
    hits.push({
      module: "gratitude",
      date: r.date,
      text: r.content
        ? r.content
        : `${(r.items ?? []).join(" ")} ${r.reflection ?? ""}`,
    });
  for (const r of en)
    hits.push({ module: "english", date: r.date, text: `${r.title ?? ""} ${r.content ?? ""}` });
  for (const r of sp)
    hits.push({ module: "spark", date: r.date, text: r.text });
  return hits;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Hit[]>([]);

  useEffect(() => {
    if (open) collectAll().then(setAll);
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return all
      .filter((h) => h.text.toLowerCase().includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 50);
  }, [all, q]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="全站搜索"
        className="fixed right-4 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-soft shadow-card backdrop-blur transition hover:text-primary"
      >
        <Search className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex justify-center">
            <motion.div
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative z-10 mt-12 flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-soft md:mt-20 md:rounded-3xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <Search className="h-4 w-4 text-ink-faint" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索所有手写记录…"
                  className="h-9 border-0 focus:ring-0"
                />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="关闭"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {!q.trim() ? (
                  <p className="py-10 text-center text-sm text-ink-faint">
                    输入关键词，检索运动、阅读、论文、实验、感恩、英文等全部记录
                  </p>
                ) : results.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-faint">没有匹配的记录</p>
                ) : (
                  <ul className="space-y-2">
                    {results.map((h, i) => (
                      <li
                        key={i}
                        className="rounded-2xl border border-line p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] text-primary">
                            {MODULE_LABEL[h.module] ?? h.module}
                          </span>
                          <span className="tabular text-[11px] text-ink-faint">
                            {h.date}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-[13px] leading-6 text-ink-soft">
                          {h.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
