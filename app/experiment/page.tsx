"use client";

import { useEffect, useMemo, useState } from "react";
import { Microscope, Search, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/common/timer";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { ExperimentRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

const TYPES = ["PCR", "WB", "细胞培养", "动物实验", "测序", "其他"];

export default function ExperimentPage() {
  const today = todayKey();
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [steps, setSteps] = useState("");
  const [result, setResult] = useState("");
  const [improvement, setImprovement] = useState("");
  const [timedMin, setTimedMin] = useState<number | null>(null);
  const [history, setHistory] = useState<ExperimentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);

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
    if (!q) return history;
    return history.filter((h) =>
      [h.name, h.type, h.steps, h.result, h.improvement]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [history, query]);

  async function save() {
    if (!name.trim()) return;
    await repos.experiment.add({
      date: today,
      name: name.trim(),
      type,
      steps: steps.trim() || undefined,
      result: result.trim() || undefined,
      improvement: improvement.trim() || undefined,
      duration: timedMin ?? undefined,
      createdAt: Date.now(),
    });
    setName("");
    setSteps("");
    setResult("");
    setImprovement("");
    setTimedMin(null);
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

      {/* 计时器 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-2">
          <span className="text-sm text-ink-soft">实验计时</span>
          <Timer
            mode="countup"
            onStop={(sec) => setTimedMin(Math.max(1, Math.round(sec / 60)))}
            size={180}
          />
          {timedMin != null && (
            <p className="text-xs text-accent-dark">本次计时 {timedMin} 分钟，将随记录保存</p>
          )}
        </CardContent>
      </Card>

      {/* 记录表单 */}
      <Card>
        <CardContent className="space-y-3">
          <div>
            <Label>实验名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：质粒转染效率检测" />
          </div>
          <div>
            <Label>实验类型</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>实验步骤</Label>
            <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder="试剂配比、操作流程、关键参数…" />
          </div>
          <div>
            <Label>结果</Label>
            <Textarea value={result} onChange={(e) => setResult(e.target.value)} rows={2} placeholder="观察到什么、数据如何…" />
          </div>
          <div>
            <Label>问题与改进思路</Label>
            <Textarea value={improvement} onChange={(e) => setImprovement(e.target.value)} rows={2} placeholder="哪里出错、下次如何优化…" />
          </div>
          <Button variant="accent" className="w-full" onClick={save} disabled={!name.trim()}>
            <Microscope className="h-4 w-4" /> 保存实验记录
          </Button>
          {saved && (
            <p className="flex items-center justify-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已保存
            </p>
          )}
        </CardContent>
      </Card>

      {/* 检索 + 历史 */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-sm font-medium text-ink-soft">历史记录</span>
          <div className="relative w-40">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称/结果…"
              className="h-9 pl-9 text-[13px]"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-faint">
              {history.length === 0 ? "还没有实验记录" : "没有匹配的结果"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((h) => (
              <Card key={h.id}>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">{h.name}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {h.date} · {h.type}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
