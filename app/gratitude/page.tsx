"use client";

import { useEffect, useState } from "react";
import { Heart, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { GratitudeRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

const SLOTS = 10;

export default function GratitudePage() {
  const today = todayKey();
  const [items, setItems] = useState<string[]>(Array(SLOTS).fill(""));
  const [reflection, setReflection] = useState("");
  const [history, setHistory] = useState<GratitudeRecord[]>([]);
  const [saved, setSaved] = useState(false);

  async function refresh() {
    const all = await repos.gratitude.all();
    setHistory(all.sort((a, b) => (a.date < b.date ? 1 : -1)));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setItem(i: number, v: string) {
    setItems((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }

  async function save() {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0 && !reflection.trim()) return;
    await repos.gratitude.add({
      date: today,
      items: cleaned,
      reflection: reflection.trim() || undefined,
      createdAt: Date.now(),
    });
    setItems(Array(SLOTS).fill(""));
    setReflection("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }

  async function remove(id?: number) {
    if (id == null) return;
    await repos.gratitude.delete(id);
    refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="感恩日记" desc="记录值得感谢的小事，训练看见光的能力" />

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-ink-soft">
            今天，我要感谢…（最多 10 条）
          </p>
          {items.map((it, i) => (
            <Input
              key={i}
              value={it}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`第 ${i + 1} 件`}
            />
          ))}
          <div>
            <Label>今日一句话感悟（可选）</Label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="今天最触动我的一句话 / 一个念头…"
              rows={3}
            />
          </div>
          <Button variant="accent" className="w-full" onClick={save}>
            <Heart className="h-4 w-4" /> 保存今日感恩
          </Button>
          {saved && (
            <p className="flex items-center justify-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已保存
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 px-1 text-sm font-medium text-ink-soft">历史日记</p>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-faint">
              还没有记录，从今天开始吧 🌿
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="tabular text-sm font-medium text-ink">
                      {h.date}
                    </span>
                    <button
                      onClick={() => remove(h.id)}
                      className="text-ink-faint hover:text-primary"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {h.items.map((it, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-soft">
                        <span className="text-accent">·</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                  {h.reflection && (
                    <p className="mt-2 rounded-2xl bg-line/30 p-3 text-[13px] italic text-ink-soft">
                      “{h.reflection}”
                    </p>
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
