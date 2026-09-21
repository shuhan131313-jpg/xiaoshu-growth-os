"use client";

import { useEffect, useState } from "react";
import { Cookie, Leaf, MinusCircle, Smartphone, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addManualDeduction,
  getLeavesEntries,
  getLeavesSummary,
  undoManualDeduction,
  type LeavesSummary,
} from "@/lib/leaves";
import type { LeavesEntry } from "@/lib/db/db";

const EMPTY_SUMMARY: LeavesSummary = {
  balance: 0,
  todayNet: 0,
  weekNet: 0,
  bySourceToday: {},
};

export default function LeavesPage() {
  const [summary, setSummary] = useState<LeavesSummary>(EMPTY_SUMMARY);
  const [entries, setEntries] = useState<LeavesEntry[]>([]);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [undoId, setUndoId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [nextSummary, nextEntries] = await Promise.all([
      getLeavesSummary(),
      getLeavesEntries(),
    ]);
    setSummary(nextSummary);
    setEntries(nextEntries);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function deduct(label: string, value: number) {
    const id = await addManualDeduction(label, value);
    setUndoId(id);
    setMessage(`已扣除 ${value} 树叶`);
    window.setTimeout(() => setUndoId((current) => (current === id ? null : current)), 8000);
    await refresh();
  }

  async function customDeduct() {
    const value = Math.abs(Math.round(Number(amount)));
    if (!reason.trim() || !value) {
      setMessage("请填写原因和扣除数量");
      return;
    }
    await deduct(reason.trim(), value);
    setReason("");
    setAmount("");
  }

  async function undo() {
    if (undoId == null) return;
    const ok = await undoManualDeduction(undoId);
    setUndoId(null);
    setMessage(ok ? "已撤销本次扣分" : "这笔扣分已经撤销");
    await refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="树叶" desc="每一片树叶，都来自一次真实行动" />

      <Card className="border-0 bg-primary text-white shadow-none">
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/65">
                <Leaf className="h-4 w-4" /> 当前余额
              </p>
              <p className="tabular mt-2 text-4xl font-semibold">{summary.balance}</p>
            </div>
            <span className="text-sm text-white/70">树叶 🌿</span>
          </div>
          <div className="mt-5 grid grid-cols-2 border-t border-white/15 pt-4">
            <div>
              <p className="text-[11px] text-white/55">今日净获得</p>
              <p className="tabular mt-1 text-lg font-medium">{signed(summary.todayNet)}</p>
            </div>
            <div className="border-l border-white/15 pl-5">
              <p className="text-[11px] text-white/55">本周净获得</p>
              <p className="tabular mt-1 text-lg font-medium">{signed(summary.weekNet)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-2 px-1">
          <h2 className="text-sm font-semibold text-ink">快速扣分</h2>
          <p className="mt-0.5 text-xs text-ink-faint">选择一次即可记录，8 秒内可以撤销</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => deduct("计划外零食", 10)}
            className="flex min-h-20 flex-col items-start justify-between rounded-xl border border-line bg-card p-3 text-left"
          >
            <Cookie className="h-5 w-5 text-primary" strokeWidth={1.7} />
            <span className="text-xs text-ink">计划外零食 <span className="text-[#9A6663]">−10</span></span>
          </button>
          <button
            type="button"
            onClick={() => deduct("无目的刷手机超过30分钟", 20)}
            className="flex min-h-20 flex-col items-start justify-between rounded-xl border border-line bg-card p-3 text-left"
          >
            <Smartphone className="h-5 w-5 text-primary" strokeWidth={1.7} />
            <span className="text-xs text-ink">无目的刷手机 <span className="text-[#9A6663]">−20</span></span>
          </button>
        </div>

        <Card className="mt-2">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <MinusCircle className="h-4 w-4" /> 自定义扣分
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <div>
                <Label>原因</Label>
                <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="简短原因" />
              </div>
              <div>
                <Label>树叶</Label>
                <Input type="number" inputMode="numeric" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="10" />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={customDeduct}>确认扣分</Button>
          </CardContent>
        </Card>

        {message && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-[#F2F2F0] px-3 py-2 text-xs text-ink-soft">
            <span>{message}</span>
            {undoId != null && (
              <button type="button" onClick={undo} className="flex items-center gap-1 font-medium text-primary">
                <Undo2 className="h-3.5 w-3.5" /> 撤销
              </button>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">积分流水</h2>
        {entries.length === 0 ? (
          <div className="border-y border-line py-10 text-center text-sm text-ink-faint">还没有树叶记录</div>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{entry.description}</p>
                  <p className="tabular mt-1 text-[11px] text-ink-faint">
                    {formatTime(entry.occurredAt)} · {entry.mode === "automatic" ? "自动" : "手动"}
                  </p>
                </div>
                <span className={`tabular shrink-0 text-sm font-medium ${entry.amount < 0 ? "text-[#9A6663]" : "text-primary"}`}>
                  {signed(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}
