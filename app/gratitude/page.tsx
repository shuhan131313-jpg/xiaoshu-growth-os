"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { GratitudeRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

export default function GratitudePage() {
  const today = todayKey();
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<GratitudeRecord[]>([]);
  const [saved, setSaved] = useState(false);

  const curMonth = useMemo(() => today.slice(0, 7), [today]);
  const monthHistory = useMemo(
    () => history.filter((h) => h.date.startsWith(curMonth)),
    [history, curMonth]
  );

  async function refresh() {
    const all = await repos.gratitude.all();
    setHistory(all.sort((a, b) => (a.date < b.date ? 1 : -1)));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const text = content.trim();
    if (!text) return;
    await repos.gratitude.add({
      date: today,
      content: text,
      createdAt: Date.now(),
    });
    setContent("");
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
          <p className="text-sm font-medium text-primary">
            今天，我要感谢…（想到什么写什么，支持换行）
          </p>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"今天让我心里一暖的瞬间…\n一件小事、一个人、一种状态，都可以写下来。"}
            rows={10}
            className="min-h-[200px] resize-y"
          />
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
        <FoldList
          items={monthHistory}
          title={
            <p className="mb-3 px-1 text-sm font-medium text-primary">
              历史日记（{monthHistory.length}）
            </p>
          }
          empty={
            <Card>
              <CardContent className="py-10 text-center text-sm text-ink-faint">
                还没有记录，从今天开始吧 🌿
              </CardContent>
            </Card>
          }
          renderItem={(h) => (
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
                {h.content ? (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                    {h.content}
                  </p>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {(h.items ?? []).map((it, i) => (
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        />
      </div>
    </div>
  );
}
