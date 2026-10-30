import { repos } from "./db/repo";
import type { WeightRecord } from "./db/db";
import { todayKey } from "./utils";

export const WEIGHT_GOAL_SETTINGS_KEY = "weightGoalSettings";
export const WEIGHT_GOAL_TARGET_JIN = 95;
export const WEIGHT_GOAL_STAGE_JIN = [105, 100, 95] as const;

export interface WeightGoalSettings {
  startDate: string;
  targetDate: string;
  startWeightJin?: number;
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function getWeightGoalSettings(today = todayKey()): Promise<WeightGoalSettings> {
  const rows = await repos.settings.all();
  const row = rows.find((item) => item.key === WEIGHT_GOAL_SETTINGS_KEY);
  const value = row?.value as Partial<WeightGoalSettings> | undefined;
  if (isDateKey(value?.startDate) && isDateKey(value?.targetDate) && value.targetDate >= value.startDate) {
    return { startDate: value.startDate, targetDate: value.targetDate };
  }
  const settings: WeightGoalSettings = { startDate: today, targetDate: addDays(today, 90) };
  if (row?.id != null) await repos.settings.update(row.id, { value: settings });
  else await repos.settings.add({ key: WEIGHT_GOAL_SETTINGS_KEY, value: settings });
  return settings;
}

export async function saveWeightGoalSettings(settings: WeightGoalSettings): Promise<void> {
  const rows = await repos.settings.all();
  const row = rows.find((item) => item.key === WEIGHT_GOAL_SETTINGS_KEY);
  if (row?.id != null) await repos.settings.update(row.id, { value: settings });
  else await repos.settings.add({ key: WEIGHT_GOAL_SETTINGS_KEY, value: settings });
}

export function validWeightRecordsSince(records: WeightRecord[], startDate: string): WeightRecord[] {
  return records.filter((record) =>
    record.date >= startDate && Number.isFinite(record.value) && record.value > 0
  );
}

export function highestWeightJin(records: WeightRecord[], startDate: string): number | null {
  const valid = validWeightRecordsSince(records, startDate);
  if (!valid.length) return null;
  return Math.max(...valid.map((record) => record.value * 2));
}

export function latestWeight(records: WeightRecord[]): WeightRecord | null {
  return [...records]
    .filter((record) => Number.isFinite(record.value) && record.value > 0 && isDateKey(record.date))
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt - a.createdAt ||
      (b.id ?? 0) - (a.id ?? 0)
    )[0] ?? null;
}

export function daysUntil(dateKey: string, today = todayKey()): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const target = new Date(year, month - 1, day).getTime();
  const current = new Date(todayYear, todayMonth - 1, todayDay).getTime();
  return Math.max(0, Math.ceil((target - current) / 86400000));
}

export function stageDates(settings: WeightGoalSettings): string[] {
  const [year, month, day] = settings.startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day).getTime();
  const [targetYear, targetMonth, targetDay] = settings.targetDate.split("-").map(Number);
  const target = new Date(targetYear, targetMonth - 1, targetDay).getTime();
  const totalDays = Math.max(3, Math.round((target - start) / 86400000));
  return [1, 2].map((part) => addDays(settings.startDate, Math.round((totalDays * part) / 3))).concat(settings.targetDate);
}

export function weightProgress(startJin: number | null, currentJin: number | null): number {
  if (startJin == null || currentJin == null || startJin <= WEIGHT_GOAL_TARGET_JIN) return currentJin != null && currentJin <= WEIGHT_GOAL_TARGET_JIN ? 100 : 0;
  return Math.min(100, Math.max(0, ((startJin - currentJin) / (startJin - WEIGHT_GOAL_TARGET_JIN)) * 100));
}
