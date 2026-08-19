"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Clock, Plus, X, Trash2, ChevronsDown, Undo2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { FoldList } from "@/components/common/fold-list";
import { repos } from "@/lib/db/repo";
import type { TimeThread, TimeCell, TimeMerge } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

const HOURS = Array.from({ length: 15 }, (_, i) => 8 + i); // 8:00 .. 22:00
const CELL_H = 72;
const HEADER_H = 44;
const fmt = (h: number) => `${h}:00`;

type Entry = {
  key: string;
  threadId: number;
  thread?: string;
  label: string;
  content: string;
  kind: "cell" | "merge";
  cellId?: number;
  mergeId?: number;
  half: 0 | 1;
};

/** 长按触发合并；在输入框/文本域上不触发，避免干扰输入 */
function useLongPress(cb: () => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = (e: ReactPointerEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    timer.current = setTimeout(() => cb(), ms);
  };
  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  return { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear };
}

/** 单小时格子：上下两半可编辑，可合并到下一小时 */
function SingleCell({
  hour,
  topValue,
  bottomValue,
  canMerge,
  onMerge,
  onEdit,
  style,
}: {
  hour: number;
  topValue: string;
  bottomValue: string;
  canMerge: boolean;
  onMerge: () => void;
  onEdit: (half: 0 | 1, v: string) => void;
  style?: CSSProperties;
}) {
  const lp = useLongPress(onMerge);
  return (
    <div
      style={style}
      {...lp}
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface"
    >
      <div className="flex flex-1 items-center px-2">
        <Input
          value={topValue}
          onChange={(e) => onEdit(0, e.target.value)}
          placeholder="这个小时做了什么"
          className="h-8 border-0 bg-transparent px-1 text-[13px] focus:bg-line/30"
        />
      </div>
      <div className="border-t border-dashed border-line" />
      <div className="flex flex-1 items-center px-2">
        <Input
          value={bottomValue}
          onChange={(e) => onEdit(1, e.target.value)}
          placeholder="同时进行的另一件事"
          className="h-8 border-0 bg-transparent px-1 text-[13px] focus:bg-line/30"
        />
      </div>
      {canMerge && (
        <button
          type="button"
          onClick={onMerge}
          onPointerDown={(e) => e.stopPropagation()}
          title="合并到下一小时"
          className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md bg-line/40 text-ink-soft transition duration-200 hover:bg-primary/15 hover:text-primary"
        >
          <ChevronsDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** 合并后的高格子：跨多小时，含撤销合并 */
function MergedCell({
  startHour,
  endHour,
  topValue,
  bottomValue,
  onSplit,
  onEdit,
  style,
}: {
  startHour: number;
  endHour: number;
  topValue: string;
  bottomValue: string;
  onSplit: () => void;
  onEdit: (half: 0 | 1, v: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-primary/40 bg-primary/5"
    >
      <button
        type="button"
        onClick={onSplit}
        className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-md bg-surface/80 px-1.5 py-0.5 text-[10px] text-ink-soft shadow-sm transition duration-200 hover:bg-primary/15 hover:text-primary"
      >
        <Undo2 className="h-3 w-3" /> 撤销合并
      </button>
      <div className="flex-1 px-2 pt-7">
        <textarea
          value={topValue}
          onChange={(e) => onEdit(0, e.target.value)}
          placeholder="做了什么"
          rows={2}
          className="w-full resize-none rounded-lg border-0 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="border-t border-dashed border-line" />
      <div className="flex-1 px-2 pb-2">
        <textarea
          value={bottomValue}
          onChange={(e) => onEdit(1, e.target.value)}
          placeholder="同时做了什么"
          rows={2}
          className="w-full resize-none rounded-lg border-0 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <span className="pointer-events-none absolute left-2 top-1.5 text-[10px] tabular text-primary/70">
        {fmt(startHour)}–{fmt(endHour)}
      </span>
    </div>
  );
}

export default function TimeMgrPage() {
  const today = useMemo(() => todayKey(), []);
  const [threads, setThreads] = useState<TimeThread[]>([]);
  const [visible, setVisible] = useState<number[]>([]);
  const [cells, setCells] = useState<Record<number, TimeCell[]>>({});
  const [merges, setMerges] = useState<Record<number, TimeMerge[]>>({});

  const cellAt = (tid: number, h: number, half: 0 | 1) =>
    cells[tid]?.find((c) => c.hour === h && c.half === half);
  const mergeCovering = (tid: number, h: number) =>
    merges[tid]?.find((m) => m.startHour <= h && h <= m.endHour);
  const mergeAnchor = (tid: number, h: number) =>
    merges[tid]?.find((m) => m.startHour === h);
  const cellContent = (tid: number, h: number, half: 0 | 1) =>
    cellAt(tid, h, half)?.content ?? "";

  async function ensureCells(tid: number) {
    const existing = (await repos.timeCell.whereDate(today)) as TimeCell[];
    const have = new Set(existing.map((c) => `${c.threadId}-${c.hour}-${c.half}`));
    const toAdd: TimeCell[] = [];
    for (const h of HOURS)
      for (const half of [0, 1] as const) {
        if (!have.has(`${tid}-${h}-${half}`))
          toAdd.push({
            threadId: tid,
            date: today,
            hour: h,
            half,
            content: "",
            createdAt: Date.now(),
          });
      }
    for (const item of toAdd) await repos.timeCell.add(item);
    const all = ((await repos.timeCell.whereDate(today)) as TimeCell[]).filter(
      (c) => c.threadId === tid
    );
    setCells((prev) => ({ ...prev, [tid]: all }));
  }

  async function loadMerges(tid: number) {
    const ms = ((await repos.timeMerge.whereDate(today)) as TimeMerge[]).filter(
      (m) => m.threadId === tid
    );
    setMerges((prev) => ({ ...prev, [tid]: ms }));
  }

  async function loadAll() {
    let ts = ((await repos.timeThread.all()) as TimeThread[]).sort(
      (a, b) => a.order - b.order
    );
    if (ts.length === 0) {
      const id = (await repos.timeThread.add({
        name: "主线",
        order: 0,
        createdAt: Date.now(),
      })) as number;
      ts = [{ id, name: "主线", order: 0, createdAt: Date.now() }];
    }
    setThreads(ts);
    setVisible([ts[0].id as number]);
    for (const t of ts) {
      await ensureCells(t.id as number);
      await loadMerges(t.id as number);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function editCell(tid: number, h: number, half: 0 | 1, value: string) {
    const c = cellAt(tid, h, half);
    if (!c?.id) return;
    await repos.timeCell.update(c.id, { content: value });
    setCells((prev) => ({
      ...prev,
      [tid]: prev[tid].map((x) => (x.id === c.id ? { ...x, content: value } : x)),
    }));
  }

  async function editMergeHalf(
    tid: number,
    mergeId: number,
    half: 0 | 1,
    value: string
  ) {
    const patch = half === 0 ? { top: value } : { bottom: value };
    await repos.timeMerge.update(mergeId, patch);
    setMerges((prev) => ({
      ...prev,
      [tid]: (prev[tid] || []).map((m) =>
        m.id === mergeId ? { ...m, ...patch } : m
      ),
    }));
  }

  async function mergeDown(tid: number, hour: number) {
    if (hour >= 22) return;
    const ms = merges[tid] || [];
    const block = mergeCovering(tid, hour);
    const startHour = block ? block.startHour : hour;
    const endHour = block ? block.endHour : hour;
    const nextHour = endHour + 1;
    if (nextHour > 22) return;
    const nextBlock = mergeCovering(tid, nextHour);
    const newStart = startHour;
    const newEnd = nextBlock ? nextBlock.endHour : nextHour;
    let top: string;
    let bottom: string;
    if (block) {
      const nextTop = nextBlock ? nextBlock.top : cellContent(tid, nextHour, 0);
      const nextBottom = nextBlock
        ? nextBlock.bottom
        : cellContent(tid, nextHour, 1);
      top = [block.top, nextTop].filter(Boolean).join(" / ");
      bottom = [block.bottom, nextBottom].filter(Boolean).join(" / ");
    } else {
      top = HOURS.filter((h) => h >= newStart && h <= newEnd)
        .map((h) => cellContent(tid, h, 0))
        .filter(Boolean)
        .join(" / ");
      bottom = HOURS.filter((h) => h >= newStart && h <= newEnd)
        .map((h) => cellContent(tid, h, 1))
        .filter(Boolean)
        .join(" / ");
    }
    const toDelete = [block, nextBlock]
      .filter(Boolean)
      .map((m) => (m as TimeMerge).id as number);
    for (const id of toDelete) await repos.timeMerge.delete(id);
    const rec: TimeMerge = {
      threadId: tid,
      date: today,
      startHour: newStart,
      endHour: newEnd,
      top,
      bottom,
      createdAt: Date.now(),
    };
    const id = (await repos.timeMerge.add(rec)) as number;
    setMerges((prev) => ({
      ...prev,
      [tid]: [
        ...(prev[tid] || []).filter(
          (m) => m.id !== block?.id && m.id !== nextBlock?.id
        ),
        { ...rec, id },
      ],
    }));
  }

  // 撤销合并：直接删除合并记录，底层原始格子内容完好恢复
  async function splitMerge(tid: number, mergeId: number) {
    await repos.timeMerge.delete(mergeId);
    setMerges((prev) => ({
      ...prev,
      [tid]: (prev[tid] || []).filter((m) => m.id !== mergeId),
    }));
  }

  async function addThread() {
    const order = threads.reduce((mx, t) => Math.max(mx, t.order), -1) + 1;
    const name = `线程 ${order + 1}`;
    const id = (await repos.timeThread.add({
      name,
      order,
      createdAt: Date.now(),
    })) as number;
    setThreads((prev) => [...prev, { id, name, order, createdAt: Date.now() }]);
    await ensureCells(id);
    await loadMerges(id);
    setVisible((prev) => [...prev, id]);
  }

  async function toggleThread(tid: number) {
    setVisible((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    );
  }

  async function deleteThread(tid: number) {
    if (threads.length <= 1) return;
    if (!window.confirm("删除该时间线程及其全部记录？此操作不可撤销。"))
      return;
    const allCells = (await repos.timeCell.all()) as TimeCell[];
    await Promise.all(
      allCells
        .filter((c) => c.threadId === tid && c.id != null)
        .map((c) => repos.timeCell.delete(c.id as number))
    );
    const allM = (await repos.timeMerge.all()) as TimeMerge[];
    await Promise.all(
      allM
        .filter((m) => m.threadId === tid && m.id != null)
        .map((m) => repos.timeMerge.delete(m.id as number))
    );
    await repos.timeThread.delete(tid);
    setThreads((prev) => prev.filter((t) => t.id !== tid));
    setVisible((prev) => prev.filter((x) => x !== tid));
    setCells((prev) => {
      const n = { ...prev };
      delete n[tid];
      return n;
    });
    setMerges((prev) => {
      const n = { ...prev };
      delete n[tid];
      return n;
    });
  }

  // 今日记录（历史）列表
  const entries: Entry[] = [];
  for (const tid of visible) {
    const th = threads.find((t) => t.id === tid);
    for (const h of HOURS) {
      const m = mergeAnchor(tid, h);
      if (m) {
        if (m.top.trim())
          entries.push({
            key: `${tid}-${h}-mt`,
            threadId: tid,
            thread: th?.name,
            label: `${fmt(h)}–${fmt(m.endHour)}`,
            content: m.top,
            kind: "merge",
            mergeId: m.id,
            half: 0,
          });
        if (m.bottom.trim())
          entries.push({
            key: `${tid}-${h}-mb`,
            threadId: tid,
            thread: th?.name,
            label: `${fmt(h)}–${fmt(m.endHour)}`,
            content: m.bottom,
            kind: "merge",
            mergeId: m.id,
            half: 1,
          });
      } else {
        const c0 = cellAt(tid, h, 0);
        const c1 = cellAt(tid, h, 1);
        if (c0 && c0.content.trim())
          entries.push({
            key: `${tid}-${h}-0`,
            threadId: tid,
            thread: th?.name,
            label: `${fmt(h)}`,
            content: c0.content,
            kind: "cell",
            cellId: c0.id,
            half: 0,
          });
        if (c1 && c1.content.trim())
          entries.push({
            key: `${tid}-${h}-1`,
            threadId: tid,
            thread: th?.name,
            label: `${fmt(h)}`,
            content: c1.content,
            kind: "cell",
            cellId: c1.id,
            half: 1,
          });
      }
    }
  }

  async function deleteEntry(e: Entry) {
    if (e.kind === "cell" && e.cellId != null) {
      await repos.timeCell.update(e.cellId, { content: "" });
      setCells((prev) => ({
        ...prev,
        [e.threadId]: (prev[e.threadId] || []).map((c) =>
          c.id === e.cellId ? { ...c, content: "" } : c
        ),
      }));
    } else if (e.kind === "merge" && e.mergeId != null) {
      const patch = e.half === 0 ? { top: "" } : { bottom: "" };
      await repos.timeMerge.update(e.mergeId, patch);
      setMerges((prev) => ({
        ...prev,
        [e.threadId]: (prev[e.threadId] || []).map((m) =>
          m.id === e.mergeId ? { ...m, ...patch } : m
        ),
      }));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="时间管理" desc="把一天拆成小时，看清时间去了哪里" />

      {/* 线程切换 + 新建 */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Clock className="h-4 w-4" /> 时间线程
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {threads.map((t) => {
              const on = visible.includes(t.id as number);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleThread(t.id as number)}
                  className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition duration-200 ${
                    on
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-line bg-surface text-ink-soft hover:bg-line/40"
                  }`}
                >
                  <span>{t.name}</span>
                  {threads.length > 1 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(t.id as number);
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-ink-faint hover:bg-line/60 hover:text-red-500"
                      aria-label="删除线程"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
            <Button variant="soft" size="sm" onClick={addThread}>
              <Plus className="h-4 w-4" /> 新建线程
            </Button>
          </div>
          <p className="mt-3 text-[12px] text-ink-faint">
            点击线程名可显示/隐藏该列；长按（或点「合并」）将一小时与下一小时合并，合并块可「撤销合并」反复操作。
          </p>
        </CardContent>
      </Card>

      {/* 时间网格 */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Clock className="h-4 w-4" /> 今日时间轴（{today}）
          </div>
          <div className="overflow-x-auto pb-2">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `60px repeat(${visible.length}, minmax(140px, 1fr))`,
                gridTemplateRows: `${HEADER_H}px repeat(15, ${CELL_H}px)`,
                minWidth: 60 + visible.length * 156,
              }}
            >
              {/* 左上角 */}
              <div
                className="sticky left-0 z-20 flex items-center justify-center bg-surface text-[11px] font-medium text-ink-faint"
                style={{ gridColumn: 1, gridRow: 1 }}
              >
                时间
              </div>
              {/* 线程表头 */}
              {visible.map((tid, j) => {
                const th = threads.find((t) => t.id === tid);
                return (
                  <div
                    key={`h${tid}`}
                    className="flex items-center px-1"
                    style={{ gridColumn: j + 1, gridRow: 1 }}
                  >
                    <span className="truncate text-[13px] font-medium text-primary">
                      {th?.name}
                    </span>
                  </div>
                );
              })}
              {/* 时间轴（左侧固定列，所有线程共用同一套刻度） */}
              {HOURS.map((h) => (
                <div
                  key={`t${h}`}
                  className="sticky left-0 z-10 flex items-center justify-end bg-surface pr-2 text-xs tabular text-ink-faint"
                  style={{ gridColumn: 1, gridRow: h - 6 }}
                >
                  {fmt(h)}
                </div>
              ))}
              {/* 线程列 */}
              {visible.map((tid, j) => (
                <Fragment key={tid}>
                  {HOURS.map((h) => {
                    const m = mergeAnchor(tid, h);
                    if (m) {
                      const span = m.endHour - m.startHour + 1;
                      return (
                        <MergedCell
                          key={`c${tid}-${h}`}
                          startHour={m.startHour}
                          endHour={m.endHour}
                          topValue={m.top}
                          bottomValue={m.bottom}
                          onSplit={() => splitMerge(tid, m.id as number)}
                          onEdit={(half, v) =>
                            editMergeHalf(tid, m.id as number, half, v)
                          }
                          style={{
                            gridColumn: j + 1,
                            gridRow: `${h - 6} / span ${span}`,
                          }}
                        />
                      );
                    }
                    if (mergeCovering(tid, h)) return null; // 被合并覆盖
                    const c0 = cellAt(tid, h, 0);
                    const c1 = cellAt(tid, h, 1);
                    return (
                      <SingleCell
                        key={`c${tid}-${h}`}
                        hour={h}
                        topValue={c0?.content ?? ""}
                        bottomValue={c1?.content ?? ""}
                        canMerge={h < 22}
                        onMerge={() => mergeDown(tid, h)}
                        onEdit={(half, v) => editCell(tid, h, half, v)}
                        style={{ gridColumn: j + 1, gridRow: h - 6 }}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 今日记录（历史，统一收起） */}
      <FoldList
        startCollapsed
        items={entries}
        title={
          <p className="text-sm font-medium text-primary">
            今日时间记录（{entries.length}）
          </p>
        }
        empty={
          <p className="py-2 text-center text-[13px] text-ink-faint">
            今天还没有时间记录
          </p>
        }
        renderItem={(e) => (
          <div
            key={e.key}
            className="flex items-start justify-between gap-2 rounded-2xl bg-line/30 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[13px] text-ink">
                <span className="font-medium text-primary">{e.label}</span>
                {e.thread && (
                  <span className="ml-2 text-[11px] text-ink-faint">
                    {e.thread}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-soft">{e.content}</p>
            </div>
            <button
              onClick={() => deleteEntry(e)}
              aria-label="删除"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />
    </div>
  );
}
