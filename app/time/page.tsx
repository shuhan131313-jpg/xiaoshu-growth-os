"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Apple, Trash2 } from "lucide-react";
import { AppleClock } from "@/components/time/apple-clock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import { todayKey } from "@/lib/utils";
import {
  MANUAL_TIME_BLOCK_KINDS,
  TIME_BLOCK_COLORS,
  blockDuration,
  exerciseBlock,
  focusBlock,
  formatClockMinute,
  manualBlock,
  type DisplayTimeBlock,
} from "@/lib/time-blocks";
import type { TimeBlockKind } from "@/lib/db/db";

export default function TimePage() {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [blocks, setBlocks] = useState<DisplayTimeBlock[]>([]);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TimeBlockKind>("other");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [message, setMessage] = useState("");

  async function load() {
    const [research, exercise, manual] = await Promise.all([
      repos.research.whereDate(date),
      repos.exercise.whereDate(date),
      repos.timeBlocks.whereDate(date),
    ]);
    setBlocks([
      ...research.map(focusBlock),
      ...exercise.map(exerciseBlock),
      ...manual.map(manualBlock),
    ].sort((a, b) => {
      const startA = ((a.startMinute % 1440) + 1440) % 1440;
      const startB = ((b.startMinute % 1440) + 1440) % 1440;
      return startA - startB;
    }));
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const dayBlocks = useMemo(() => blocks, [blocks]);

  async function addManualBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start == null || end == null || start === end) {
      setMessage("请输入有效的起止时间");
      return;
    }
    await repos.timeBlocks.add({
      date,
      startMinute: start,
      endMinute: end,
      kind,
      label: label.trim() || MANUAL_TIME_BLOCK_KINDS.find((item) => item.value === kind)?.label || "其他",
      createdAt: Date.now(),
    });
    setLabel("");
    await load();
    setMessage("时间段已记录");
  }

  async function removeManualBlock(id: string) {
    if (!id.startsWith("manual-")) return;
    const numericId = Number(id.slice("manual-".length));
    if (!Number.isFinite(numericId)) return;
    await repos.timeBlocks.delete(numericId);
    await load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="苹果时钟" desc="把一天的时间段画在一只 24 小时的小苹果上" />

      <Card>
        <CardContent className="flex flex-col items-center gap-3">
          <div className="flex w-full items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary"><Apple className="h-4 w-4" />时间记录</p>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 w-auto px-2 text-xs" aria-label="查看日期" />
          </div>
          <AppleClock blocks={dayBlocks} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-primary">手动记录时间段</p>
          <form onSubmit={addManualBlock} className="space-y-2">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="做了什么？如：睡觉、阅读、聚餐" />
            <div className="grid grid-cols-2 gap-2">
              <select value={kind} onChange={(event) => setKind(event.target.value as TimeBlockKind)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink" aria-label="时间段类型">
                {MANUAL_TIME_BLOCK_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="text" inputMode="numeric" maxLength={5} value={startTime} onChange={(event) => setStartTime(event.target.value)} placeholder="开始 05:30" aria-label="开始时间" />
                <Input type="text" inputMode="numeric" maxLength={5} value={endTime} onChange={(event) => setEndTime(event.target.value)} placeholder="结束 06:00" aria-label="结束时间" />
              </div>
            </div>
            <Button variant="accent" className="w-full" type="submit">记录时间段</Button>
          </form>
          {message && <p className="mt-2 text-center text-xs text-ink-faint">{message}</p>}
        </CardContent>
      </Card>

      {dayBlocks.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-3 text-sm font-medium text-primary">当天时间段</p>
            <div className="divide-y divide-line border-y border-line">
              {dayBlocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TIME_BLOCK_COLORS[block.kind] }} />
                  <span className="tabular w-28 shrink-0 text-xs text-ink-faint">{formatClockMinute(block.startMinute)}-{formatClockMinute(block.endMinute)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{block.label}</span>
                  <span className="text-[10px] text-ink-faint">{block.source === "focus" ? "专注" : block.source === "exercise" ? "运动" : `${blockDuration(block.startMinute, block.endMinute)} min`}</span>
                  {block.source === "manual" && <button type="button" onClick={() => removeManualBlock(block.id)} aria-label="删除时间段" className="shrink-0 p-1 text-ink-faint hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function parseTime(value: string): number | null {
  const raw = value.trim();
  const compact = /^(\d{4})$/.exec(raw);
  const match = compact
    ? [raw, raw.slice(0, 2), raw.slice(2)]
    : /^(\d{1,2})[:：](\d{1,2})$/.exec(raw);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
