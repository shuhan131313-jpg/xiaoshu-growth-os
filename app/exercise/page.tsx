"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Dumbbell, Scale, CheckCircle2, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/common/sheet";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import { db } from "@/lib/db/db";
import type { ExerciseRecord, WeightRecord, BowelRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { lastNDailyCount } from "@/lib/summary";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export default function ExercisePage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [marked, setMarked] = useState<Record<string, number>>({}); // date -> count
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [dayRecords, setDayRecords] = useState<ExerciseRecord[]>([]);
  const [project, setProject] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [monthStat, setMonthStat] = useState({ count: 0, minutes: 0 });
  const [trend, setTrend] = useState<{ date: string; value: number }[]>([]);

  // 体重 / 排便 简易记录
  const [weightInput, setWeightInput] = useState("");
  const [weightNote, setWeightNote] = useState("");
  const [weights, setWeights] = useState<WeightRecord[]>([]); // 最新在前
  const [bowelNote, setBowelNote] = useState("");
  const [bowelDoneToday, setBowelDoneToday] = useState(false);
  const [bowelLog, setBowelLog] = useState<BowelRecord[]>([]); // 最新在前

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  async function loadMonth() {
    const all = await db.exercise.toArray();
    const m: Record<string, number> = {};
    let count = 0;
    let minutes = 0;
    for (const r of all) {
      if (r.date.startsWith(monthPrefix)) {
        m[r.date] = (m[r.date] || 0) + 1;
        count++;
        minutes += r.duration || 0;
      }
    }
    setMarked(m);
    setMonthStat({ count, minutes });
    setTrend(await lastNDailyCount(db.exercise, 7));
  }

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function loadHealth() {
    const [wAll, bAll] = await Promise.all([
      repos.weight.all(),
      repos.bowel.all(),
    ]);
    const wSorted = wAll.sort((a, b) => b.date.localeCompare(a.date));
    setWeights(wSorted);
    const todayW = wSorted.find((w) => w.date === todayKey());
    if (todayW) {
      setWeightInput(String(todayW.value));
      setWeightNote(todayW.note || "");
    } else {
      setWeightInput("");
      setWeightNote("");
    }
    const bSorted = bAll.sort((a, b) => b.date.localeCompare(a.date));
    setBowelLog(bSorted);
    const todayB = bSorted.find((b) => b.date === todayKey());
    setBowelDoneToday(!!todayB);
    if (todayB) setBowelNote(todayB.note || "");
    else setBowelNote("");
  }

  useEffect(() => {
    loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveWeight() {
    const v = Number(weightInput);
    if (!weightInput.trim() || isNaN(v) || v <= 0) return;
    const existing = await repos.weight.whereDate(todayKey());
    if (existing.length > 0) {
      await repos.weight.update(existing[0].id!, {
        value: v,
        note: weightNote.trim() || undefined,
        createdAt: Date.now(),
      });
    } else {
      await repos.weight.add({
        date: todayKey(),
        value: v,
        note: weightNote.trim() || undefined,
        createdAt: Date.now(),
      });
    }
    await loadHealth();
  }

  async function deleteWeight(id?: number) {
    if (id == null) return;
    await repos.weight.delete(id);
    await loadHealth();
  }

  async function toggleBowel() {
    if (bowelDoneToday) {
      const ex = await repos.bowel.whereDate(todayKey());
      if (ex.length > 0) await repos.bowel.delete(ex[0].id!);
    } else {
      await repos.bowel.add({
        date: todayKey(),
        note: bowelNote.trim() || undefined,
        createdAt: Date.now(),
      });
    }
    await loadHealth();
  }

  async function deleteBowel(id?: number) {
    if (id == null) return;
    await repos.bowel.delete(id);
    await loadHealth();
  }

  async function openDay(date: string) {
    setSheetDate(date);
    setDayRecords(await repos.exercise.whereDate(date));
    setProject("");
    setDuration("");
    setNote("");
  }

  async function save() {
    if (!sheetDate || !project.trim() || !duration) return;
    await repos.exercise.add({
      date: sheetDate,
      project: project.trim(),
      duration: Number(duration) || 0,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    });
    setDayRecords(await repos.exercise.whereDate(sheetDate));
    setProject("");
    setDuration("");
    setNote("");
    loadMonth();
  }

  async function remove(id?: number) {
    if (id == null || !sheetDate) return;
    await repos.exercise.delete(id);
    setDayRecords(await repos.exercise.whereDate(sheetDate));
    loadMonth();
  }

  // 月历格子
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  const maxTrend = Math.max(1, ...trend.map((t) => t.value));

  return (
    <div className="space-y-5">
      <PageHeader title="运动" desc="记录每一次流汗，看见坚持的形状" />

      {/* 月历 */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              aria-label="上个月"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-ink">{monthPrefix}</p>
            <button
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              aria-label="下个月"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-faint">
            {WEEK.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d == null) return <div key={`e${i}`} />;
              const date = `${monthPrefix}-${String(d).padStart(2, "0")}`;
              const cnt = marked[date] || 0;
              const isToday = date === todayKey();
              return (
                <button
                  key={date}
                  onClick={() => openDay(date)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-sm transition duration-200 ${
                    isToday
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-ink hover:bg-line/40"
                  }`}
                >
                  {d}
                  {cnt > 0 && (
                    <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-xs text-ink-faint">本月次数</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">
              {monthStat.count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-ink-faint">本月总时长</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">
              {monthStat.minutes}
              <span className="text-sm font-normal text-ink-faint"> 分</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 周趋势 */}
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-ink-soft">近 7 天趋势</p>
          <div className="flex h-24 items-end justify-between gap-2">
            {trend.map((t, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(t.value / maxTrend) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="w-full rounded-t-md bg-accent/70"
                  />
                </div>
                <span className="text-[10px] text-ink-faint">
                  {t.date.slice(5).replace("-", "/")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 记录当日入口 */}
      <Button
        variant="accent"
        className="w-full"
        onClick={() => openDay(todayKey())}
      >
        <Plus className="h-4 w-4" /> 记录今天的运动
      </Button>

      {/* 日期记录弹层 */}
      <Sheet open={!!sheetDate} onClose={() => setSheetDate(null)} title={sheetDate || ""}>
        <div className="space-y-4">
          {dayRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-soft">当日记录</p>
              {dayRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between rounded-2xl bg-line/30 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {r.project}
                      <span className="ml-2 text-xs text-ink-faint">
                        {r.duration} 分钟
                      </span>
                    </p>
                    {r.note && (
                      <p className="mt-0.5 text-xs text-ink-soft">{r.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-ink-faint hover:text-primary"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>运动项目</Label>
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="如：慢跑 / 瑜伽 / 力量训练"
            />
          </div>
          <div>
            <Label>时长（分钟）</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
            />
          </div>
          <div>
            <Label>备注（可选）</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天的状态、配速、感受…"
              rows={3}
            />
          </div>
          <Button
            variant="accent"
            className="w-full"
            onClick={save}
            disabled={!project.trim() || !duration}
          >
            <Dumbbell className="h-4 w-4" /> 保存记录
          </Button>
        </div>
      </Sheet>

      {/* 身体指标：体重 / 排便 */}
      <div className="space-y-5 pt-1">
        {/* 体重 */}
        <Card>
          <CardContent>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Scale className="h-4 w-4" /> 体重
            </div>
            <p className="mb-3 text-[13px] text-ink-faint">
              记录每日体重，自动留存历史
            </p>
            <Label>今日体重（kg）</Label>
            <Input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="如 65.5"
            />
            <div className="mt-3">
              <Label>备注（可选）</Label>
              <Input
                value={weightNote}
                onChange={(e) => setWeightNote(e.target.value)}
                placeholder="体感、时段…"
              />
            </div>
            <Button
              variant="accent"
              className="mt-3 w-full"
              onClick={saveWeight}
              disabled={!weightInput.trim()}
            >
              保存今日体重
            </Button>

            {weights.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-ink-soft">
                  近期记录（{weights.length}）
                </p>
                {weights.slice(0, 8).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-2xl bg-line/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="tabular text-sm font-medium text-ink">
                        {w.value}
                      </span>
                      <span className="text-[11px] text-ink-faint">kg</span>
                      <span className="tabular text-[11px] text-ink-faint">
                        {w.date}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      {w.note && (
                        <span className="max-w-[40%] truncate text-[11px] text-ink-soft">
                          {w.note}
                        </span>
                      )}
                      <button
                        onClick={() => deleteWeight(w.id)}
                        aria-label="删除体重记录"
                        className="shrink-0 text-ink-faint transition duration-200 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 排便记录 */}
        <Card>
          <CardContent>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> 排便记录
            </div>
            <p className="mb-3 text-[13px] text-ink-faint">
              极简打卡，记录每日状态
            </p>
            {!bowelDoneToday && (
              <div>
                <Label>备注（可选）</Label>
                <Input
                  value={bowelNote}
                  onChange={(e) => setBowelNote(e.target.value)}
                  placeholder="状态、备注…"
                />
              </div>
            )}
            <Button
              variant={bowelDoneToday ? "soft" : "accent"}
              className="mt-3 w-full"
              onClick={toggleBowel}
            >
              {bowelDoneToday ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> 今日已打卡
                </>
              ) : (
                "标记今日完成"
              )}
            </Button>

            {bowelLog.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-ink-soft">
                  打卡日志（{bowelLog.length}）
                </p>
                {bowelLog.slice(0, 14).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-2xl bg-line/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="tabular text-sm text-ink">{b.date}</span>
                      {b.note && (
                        <span className="truncate text-[11px] text-ink-soft">
                          {b.note}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBowel(b.id)}
                      aria-label="删除打卡记录"
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
      </div>
    </div>
  );
}
