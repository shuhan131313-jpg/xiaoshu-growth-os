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
  { value: "reading", label: "阅读", color: "#8EA7B7" },
  { value: "meal", label: "聚餐", color: "#D7AE72" },
  { value: "entertainment", label: "娱乐", color: "#B79BBE" },
  { value: "other", label: "其他", color: "#A6A9A5" },
];

export const TIME_BLOCK_COLORS: Record<DisplayTimeBlock["kind"], string> = {
  focus: "#38506B",
  exercise: "#9AAEC2",
  sleep: "#9FAFC4",
  reading: "#8EA7B7",
  meal: "#D7AE72",
  entertainment: "#B79BBE",
  other: "#A6A9A5",
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
