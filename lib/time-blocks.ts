import type { ExerciseRecord, ResearchRecord, TimeBlockKind, TimeBlockRecord } from "./db/db";

export type DisplayTimeBlock = {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  kind: TimeBlockKind | "focus" | "exercise";
  label: string;
  source: "focus" | "exercise" | "manual";
};

export const MANUAL_TIME_BLOCK_KINDS: { value: TimeBlockKind; label: string; color: string }[] = [
  { value: "sleep", label: "睡觉", color: "#9FAFC4" },
  { value: "meal", label: "吃饭", color: "#D7AE72" },
  { value: "entertainment", label: "亲故", color: "#B79BBE" },
  { value: "reading", label: "阅读", color: "#8EA7B7" },
  { value: "other", label: "其他", color: "#A6A9A5" },
];

export const TIME_BLOCK_COLORS: Record<DisplayTimeBlock["kind"], string> = {
  focus: "#4E7BAA",
  exercise: "#7899B5",
  sleep: "#D4A6B3",
  reading: "#A5C79B",
  meal: "#C99262",
  entertainment: "#B7A2D0",
  other: "#B8BCBF",
};

export type TimeSummaryKind = DisplayTimeBlock["kind"] | "blank";

/** 顶部时长摘要的固定顺序；展示时会隐藏没有记录的类别，但始终保留空白。 */
export const TIME_SUMMARY_ORDER: TimeSummaryKind[] = [
  "sleep",
  "focus",
  "exercise",
  "reading",
  "meal",
  "entertainment",
  "other",
  "blank",
];

export const TIME_SUMMARY_LABELS: Record<TimeSummaryKind, string> = {
  sleep: "睡觉",
  focus: "专注",
  exercise: "运动",
  reading: "阅读",
  meal: "吃饭",
  entertainment: "亲故",
  other: "其他",
  blank: "空白",
};

export const TIME_SUMMARY_COLORS: Record<TimeSummaryKind, string> = {
  ...TIME_BLOCK_COLORS,
  // 空白没有扇形，使用苹果表盘的中性底色表示未记录时间。
  blank: "#DDE4EA",
};

export function formatClockMinute(minute: number): string {
  const normalized = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

/** 用记录保存时刻减去持续时长，推算这段活动的大致发生时间。 */
export function inferredTimeRange(createdAt: number, durationMinutes: number): string {
  const endDate = new Date(Number.isFinite(createdAt) ? createdAt : Date.now());
  const endMinute = endDate.getHours() * 60 + endDate.getMinutes();
  const duration = Math.max(0, Number(durationMinutes) || 0);
  return `${formatClockMinute(endMinute - duration)}-${formatClockMinute(endMinute)}`;
}

export function focusBlock(record: ResearchRecord): DisplayTimeBlock {
  const endDate = new Date(record.createdAt);
  const endMinute = endDate.getHours() * 60 + endDate.getMinutes();
  return {
    id: `focus-${record.id ?? record.createdAt}`,
    date: record.date,
    startMinute: endMinute - Math.max(0, Number(record.duration) || 0),
    endMinute,
    kind: "focus",
    label: record.summary || "专注",
    source: "focus",
  };
}

export function exerciseBlock(record: ExerciseRecord): DisplayTimeBlock {
  const endDate = new Date(record.createdAt);
  const endMinute = endDate.getHours() * 60 + endDate.getMinutes();
  return {
    id: `exercise-${record.id ?? record.createdAt}`,
    date: record.date,
    startMinute: endMinute - Math.max(0, Number(record.duration) || 0),
    endMinute,
    kind: "exercise",
    label: record.project || "运动",
    source: "exercise",
  };
}

export function manualBlock(record: TimeBlockRecord): DisplayTimeBlock {
  return {
    id: `manual-${record.id ?? record.createdAt}`,
    date: record.date,
    startMinute: record.startMinute,
    endMinute: record.endMinute,
    kind: record.kind,
    label: record.label,
    source: "manual",
  };
}

export function blockDuration(startMinute: number, endMinute: number): number {
  const start = ((startMinute % 1440) + 1440) % 1440;
  const end = ((endMinute % 1440) + 1440) % 1440;
  return end >= start ? end - start : 1440 - start + end;
}

function splitInterval(startMinute: number, endMinute: number): [number, number][] {
  const start = ((startMinute % 1440) + 1440) % 1440;
  const end = ((endMinute % 1440) + 1440) % 1440;
  if (end >= start) return [[start, end]];
  return [[start, 1440], [0, end]];
}

/** 汇总各类别时长，并用所有时间段的并集估算未记录的“空白”时间。 */
export function summarizeTimeBlocks(blocks: DisplayTimeBlock[]): Record<TimeSummaryKind, number> {
  const minutes = Object.fromEntries(TIME_SUMMARY_ORDER.map((kind) => [kind, 0])) as Record<TimeSummaryKind, number>;
  const intervals: [number, number][] = [];
  blocks.forEach((block) => {
    const duration = blockDuration(block.startMinute, block.endMinute);
    if (duration > 0) minutes[block.kind] += duration;
    intervals.push(...splitInterval(block.startMinute, block.endMinute));
  });

  intervals.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let current: [number, number] | null = null;
  intervals.forEach(([start, end]) => {
    if (!current) {
      current = [start, end];
      return;
    }
    if (start <= current[1]) {
      current[1] = Math.max(current[1], end);
    } else {
      covered += current[1] - current[0];
      current = [start, end];
    }
  });
  if (current) covered += current[1] - current[0];
  minutes.blank = Math.max(0, 1440 - covered);
  return minutes;
}
