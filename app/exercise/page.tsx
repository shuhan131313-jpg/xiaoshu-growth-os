"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Scale, CheckCircle2, Check, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/common/sheet";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import { db } from "@/lib/db/db";
import type { ExerciseRecord, WeightRecord, BowelRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { bumpGrowthStep } from "@/lib/growth";
import { setTodayTask } from "@/lib/summary";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 极简体重折线图：仅 XY 细轴，无网格、无大量刻度。
 * - X 轴：只展示「有体重记录」的日期（按记录索引等距排布）。
 * - Y 轴：按数据自动范围（min/max + 15% 留白），仅标注极值。
 * - 柔和蓝折线 + 描点，显示当日体重。
 */
function WeightChart({ data }: { data: WeightRecord[] }) {
  if (data.length === 0) return null;
  const pts = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const W = 340;
  const H = 168;
  const padL = 30;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xs = (i: number) =>
    pts.length === 1 ? padL + plotW / 2 : padL + (plotW * i) / (pts.length - 1);
  const vals = pts.map((p) => p.value);
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  let lo = dataMin;
  let hi = dataMax;
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  } else {
    const p = (hi - lo) * 0.15;
    lo -= p;
    hi += p;
  }
  const ys = (v: number) => padT + plotH * (1 - (v - lo) / (hi - lo));
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)} ${ys(p.value).toFixed(1)}`)
    .join(" ");
  const axis = "#C9CED6";
  const label = "#666666";
  const blue = "#1A3F90";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 168 }}
      role="img"
      aria-label="体重趋势折线图"
    >
      {/* 坐标轴（仅细线） */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={axis} strokeWidth={1} />
      <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke={axis} strokeWidth={1} />
      {/* Y 轴极值标签（不堆砌刻度） */}
      <text x={padL - 5} y={ys(dataMax) + 3} textAnchor="end" fontSize={9} fill={label}>
        {Math.round(dataMax * 10) / 10}
      </text>
      <text x={padL - 5} y={ys(dataMin) + 3} textAnchor="end" fontSize={9} fill={label}>
        {Math.round(dataMin * 10) / 10}
      </text>
      {/* 折线 */}
      <path d={d} fill="none" stroke={blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* 描点：当日体重 */}
      {pts.map((p, i) => (
        <circle key={p.id ?? i} cx={xs(i)} cy={ys(p.value)} r={3} fill={blue} />
      ))}
      {/* X 轴：仅展示有记录的日期 */}
      {pts.map((p, i) => (
        <text
          key={`x${p.id ?? i}`}
          x={xs(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize={8.5}
          fill={label}
        >
          {p.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export default function ExercisePage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [exerciseDates, setExerciseDates] = useState<Record<string, boolean>>({});
  const [bowelDates, setBowelDates] = useState<Record<string, boolean>>({});
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExerciseRecord | null>(null);
  const [project, setProject] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  // 全部运动历史（可编辑 / 删除）
  const [history, setHistory] = useState<ExerciseRecord[]>([]);

  // 体重 / 排便 简易记录
  const [weightInput, setWeightInput] = useState("");
  const [weights, setWeights] = useState<WeightRecord[]>([]); // 最新在前
  const [bowelNote, setBowelNote] = useState("");
  const [bowelDoneToday, setBowelDoneToday] = useState(false);
  const [bowelLog, setBowelLog] = useState<BowelRecord[]>([]); // 最新在前

  // 日历日期详情（页内内联展开，只读极简文字，不弹窗）
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailExercise, setDetailExercise] = useState<ExerciseRecord[]>([]);
  const [detailBowel, setDetailBowel] = useState(false);
  const [detailWeight, setDetailWeight] = useState<number | null>(null);

  const calPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  // 「本月」= 真实当前月份，用于历史记录折叠展示
  const curMonth = useMemo(() => todayKey().slice(0, 7), [today]);

  const monthHistory = useMemo(
    () => history.filter((r) => r.date.startsWith(curMonth)),
    [history, curMonth]
  );
  const monthWeights = useMemo(
    () => weights.filter((w) => w.date.startsWith(curMonth)),
    [weights, curMonth]
  );
  const monthBowel = useMemo(
    () => bowelLog.filter((b) => b.date.startsWith(curMonth)),
    [bowelLog, curMonth]
  );

  async function loadMonth() {
    const [exAll, bwAll] = await Promise.all([
      db.exercise.toArray(),
      repos.bowel.all(),
    ]);
    const ex: Record<string, boolean> = {};
    const bw: Record<string, boolean> = {};
    for (const r of exAll) {
      if (r.date.startsWith(calPrefix)) ex[r.date] = true;
    }
    for (const b of bwAll) {
      if (b.date.startsWith(calPrefix)) bw[b.date] = true;
    }
    setExerciseDates(ex);
    setBowelDates(bw);
  }

  async function loadAll() {
    const all = await db.exercise.toArray();
    setHistory(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    loadMonth();
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } else {
      setWeightInput("");
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
        createdAt: Date.now(),
      });
    } else {
      await repos.weight.add({
        date: todayKey(),
        value: v,
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

  async function openDetail(date: string) {
    const [ex, bw, w] = await Promise.all([
      repos.exercise.whereDate(date),
      repos.bowel.whereDate(date),
      repos.weight.whereDate(date),
    ]);
    setDetailExercise(ex);
    setDetailBowel(bw.length > 0);
    setDetailWeight(w.length > 0 ? w[0].value : null);
    setDetailDate(date);
  }

  function startEdit(r: ExerciseRecord) {
    setEditing(r);
    setSheetDate(r.date);
    setProject(r.project);
    setDuration(String(r.duration));
    setNote(r.note || "");
  }

  function cancelEdit() {
    setEditing(null);
    setSheetDate(null);
    setProject("");
    setDuration("");
    setNote("");
  }

  async function saveExercise() {
    if (!project.trim() || !duration) return;
    await repos.exercise.add({
      date: todayKey(),
      project: project.trim(),
      duration: Number(duration) || 0,
      createdAt: Date.now(),
    });
    await setTodayTask(todayKey(), "exercise", true);
    await bumpGrowthStep();
    setProject("");
    setDuration("");
    loadMonth();
    loadAll();
  }

  async function saveEdit() {
    if (!editing?.id || !project.trim() || !duration) return;
    await repos.exercise.update(editing.id, {
      project: project.trim(),
      duration: Number(duration) || 0,
      note: note.trim() || undefined,
    });
    cancelEdit();
    loadMonth();
    loadAll();
  }

  async function remove(id?: number) {
    if (id == null) return;
    if (editing?.id === id) cancelEdit();
    await repos.exercise.delete(id);
    loadMonth();
    loadAll();
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
            <p className="text-sm font-medium text-ink">{calPrefix}</p>
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
              const date = `${calPrefix}-${String(d).padStart(2, "0")}`;
              const exDone = !!exerciseDates[date];
              const bwDone = !!bowelDates[date];
              const isToday = date === todayKey();
              const isActive = date === detailDate;
              return (
                <button
                  key={date}
                  onClick={() => openDetail(date)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition duration-200 ${
                    isActive
                      ? "bg-accent/20 font-semibold text-accent-dark"
                      : isToday
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-ink hover:bg-line/40"
                  }`}
                >
                  <span>{d}</span>
                  <span className="mt-0.5 flex h-3 items-center justify-center gap-0.5">
                    {exDone && (
                      <Dumbbell className="h-3 w-3 text-accent" strokeWidth={2.25} />
                    )}
                    {bwDone && (
                      <span className="text-[10px] leading-none">💩</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 日历日期详情（页内内联展开，极简文字，不弹窗） */}
      {detailDate && (
        <Card>
          <CardContent>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-primary">{detailDate} 记录</p>
              <button
                onClick={() => setDetailDate(null)}
                className="text-xs text-ink-faint transition duration-200 hover:text-primary"
              >
                收起
              </button>
            </div>
            <div className="space-y-1 text-sm text-ink">
              {detailExercise.map((r, i) => (
                <p key={i}>
                  {r.project} {r.duration} 分钟
                </p>
              ))}
              {detailWeight != null && <p>体重 {detailWeight} kg</p>}
              {detailBowel && <p>已排便</p>}
              {detailExercise.length === 0 &&
                detailWeight == null &&
                !detailBowel && <p className="text-ink-faint">当天无记录</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 运动打卡（与体重模块一致的小框样式） */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Dumbbell className="h-4 w-4" /> 运动打卡
          </div>
          <p className="mb-3 text-[13px] text-ink-faint">
            记录今天的项目与时长，自动留存历史
          </p>
          <Label>运动项目</Label>
          <Input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="如：慢跑 / 瑜伽 / 力量训练"
          />
          <Label className="mt-3 block">时长（分钟）</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
          />
          <Button
            variant="accent"
            className="mt-3 w-full"
            onClick={saveExercise}
            disabled={!project.trim() || !duration}
          >
            <Dumbbell className="h-4 w-4" /> 保存今日运动
          </Button>
        </CardContent>
      </Card>

      {/* 编辑弹层（仅用于编辑已有记录） */}
      <Sheet
        open={!!sheetDate}
        onClose={() => {
          setSheetDate(null);
          cancelEdit();
        }}
        title={sheetDate || ""}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-primary">编辑运动记录</p>
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
            onClick={saveEdit}
            disabled={!project.trim() || !duration}
          >
            <Dumbbell className="h-4 w-4" />
            更新记录
          </Button>
          <Button variant="ghost" className="w-full" onClick={cancelEdit}>
            取消编辑
          </Button>
        </div>
      </Sheet>

      {/* 运动历史（可编辑 / 删除，统一折叠） */}
      <FoldList
        items={monthHistory}
        startCollapsed
        title={
          <p className="text-sm font-medium text-primary">
            运动历史（{monthHistory.length}）
          </p>
        }
        empty={
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-faint">
              本月还没有运动记录
            </CardContent>
          </Card>
        }
        renderItem={(r) => (
          <Card key={r.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {r.project}
                    <span className="ml-2 text-xs text-ink-faint">
                      {r.duration} 分钟
                    </span>
                  </p>
                  <p className="mt-0.5 tabular text-[11px] text-ink-faint">
                    {r.date}
                  </p>
                  {r.note && (
                    <p className="mt-1 text-[13px] text-ink-soft">{r.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEdit(r)}
                    aria-label="编辑"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="删除"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      />

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
            <Button
              variant="accent"
              className="mt-3 w-full"
              onClick={saveWeight}
              disabled={!weightInput.trim()}
            >
              保存今日体重
            </Button>

            {weights.length > 0 && (
              <div className="mt-4">
                <FoldList
                  items={monthWeights}
                  startCollapsed
                  title={
                    <p className="text-xs font-medium text-primary">
                      近期记录（{monthWeights.length}）
                    </p>
                  }
                  renderItem={(w) => (
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
                  )}
                />
              </div>
            )}
            {weights.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-primary">体重趋势</p>
                <WeightChart data={weights} />
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
              <div className="mt-4">
                <FoldList
                  items={monthBowel}
                  startCollapsed
                  title={
                    <p className="text-xs font-medium text-primary">
                      打卡日志（{monthBowel.length}）
                    </p>
                  }
                  renderItem={(b) => (
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
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
