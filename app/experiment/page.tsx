"use client";

import { useEffect, useMemo, useState } from "react";
import { Microscope, Search, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ExperimentRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

export default function ExperimentPage() {
  const today = todayKey();
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<ExperimentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);

  const curMonth = useMemo(() => today.slice(0, 7), [today]);
  const monthHistory = useMemo(
    () => history.filter((h) => h.date.startsWith(curMonth)),
    [history, curMonth]
  );

  async function refresh() {
    const all = await repos.experiment.all();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monthHistory;
    return monthHistory.filter((h) =>
      [h.name, h.type, h.steps, h.result, h.improvement, h.note]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [monthHistory, query]);

  async function save() {
    if (!note.trim()) return;
    await repos.experiment.add({
      date: today,
      note: note.trim(),
      createdAt: Date.now(),
    });
    setNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }

  async function remove(id?: number) {
    if (id == null) return;
    await repos.experiment.delete(id);
    refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="实验记录" desc="把每一步操作留下，复盘时有据可循" />

      {/* 记录表单：单一自由文本框 */}
      <Card>
        <CardContent className="space-y-3">
          <Label>实验记录（自由填写：名称、步骤、结果、思路…）</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={8}
            placeholder="随时把实验相关的想法、操作、观察、结论写在这里…"
          />
          <Button
            variant="accent"
            className="w-full"
            onClick={save}
            disabled={!note.trim()}
          >
            <Microscope className="h-4 w-4" /> 保存实验记录
          </Button>
          {saved && (
            <p className="flex items-center justify-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已保存
            </p>
          )}
        </CardContent>
      </Card>

      {/* 检索 + 历史（统一折叠） */}
      <FoldList
        items={filtered}
        title={
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-sm font-medium text-ink-soft">
              历史记录（{filtered.length}）
            </span>
            <div className="relative w-40">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索内容…"
                className="h-9 pl-9 text-[13px]"
              />
            </div>
          </div>
        }
        empty={
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-faint">
              {monthHistory.length === 0 ? "还没有实验记录" : "没有匹配的结果"}
            </CardContent>
          </Card>
        }
        renderItem={(h) => (
          <Card key={h.id}>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {h.name || "实验记录"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {h.date}
                    {h.type ? ` · ${h.type}` : ""}
                    {h.duration ? ` · ${h.duration} 分钟` : ""}
                  </p>
                </div>
                <button
                  onClick={() => remove(h.id)}
                  className="text-xs text-ink-faint hover:text-primary"
                >
                  删除
                </button>
              </div>
              {h.note && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                  {h.note}
                </p>
              )}
              {h.steps && (
                <p className="mt-2 text-[13px] text-ink-soft">
                  <span className="font-medium text-ink-soft">步骤：</span>
                  {h.steps}
                </p>
              )}
              {h.result && (
                <p className="mt-1 text-[13px] text-ink-soft">
                  <span className="font-medium text-ink-soft">结果：</span>
                  {h.result}
                </p>
              )}
              {h.improvement && (
                <p className="mt-1 text-[13px] text-ink-soft">
                  <span className="font-medium text-ink-soft">改进：</span>
                  {h.improvement}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
