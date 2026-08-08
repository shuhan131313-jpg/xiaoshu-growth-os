import { db } from "./db/db";
import { repos } from "./db/repo";
import type {
  ExerciseRecord,
  ReadingRecord,
  ResearchRecord,
  EnglishRecord,
  ExperimentRecord,
  GratitudeRecord,
  LiteratureItem,
  AccountRecord,
} from "./db/db";
import { TODAY_MODULES, type TodayModuleKey } from "./constants";
import { todayKey } from "./utils";

/** 读取某天今日待办完成映射 { key: done } */
export async function getTodayTaskMap(date: string): Promise<Record<string, boolean>> {
  const rows = await db.dailyTasks.where("date").equals(date).toArray();
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.key] = r.done;
  return map;
}

/** 勾选/取消今日某模块（按 date+key 幂等写入） */
export async function setTodayTask(date: string, key: string, done: boolean): Promise<void> {
  const existing = await db.dailyTasks
    .where("date")
    .equals(date)
    .filter((t) => t.key === key)
    .first();
  if (existing?.id != null) {
    await db.dailyTasks.update(existing.id, { done });
  } else {
    await db.dailyTasks.add({ date, key, done });
  }
}

/** 今日完成率（已完成模块数 / 总模块数） */
export async function getCompletionRate(date: string): Promise<number> {
  const map = await getTodayTaskMap(date);
  const done = TODAY_MODULES.filter((m) => map[m.key]).length;
  return TODAY_MODULES.length ? done / TODAY_MODULES.length : 0;
}

/** 今日各项时长合计（运动/阅读/论文，单位分钟） */
export async function getTodayDuration(date: string): Promise<number> {
  const [ex, rd, rs] = await Promise.all([
    repos.exercise.whereDate(date),
    repos.reading.whereDate(date),
    repos.research.whereDate(date),
  ]);
  const sum = (arr: { duration: number }[]) => arr.reduce((a, b) => a + (b.duration || 0), 0);
  return sum(ex) + sum(rd) + sum(rs);
}

/** 连续打卡天数：从今天往前数有记录的天数（今天没记录则从昨天起算，避免当天未打卡就归零） */
export async function computeStreak(dates: string[]): Promise<number> {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  if (!set.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 近 N 天习惯热力图数据：每天「今日待办」完成数（0–总模块数） */
export async function getHeatmap(days = 7): Promise<{ date: string; count: number }[]> {
  const out: { date: string; count: number }[] = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const k = todayKey(d);
    const rows = await db.dailyTasks.where("date").equals(k).toArray();
    const done = rows.filter((r) => r.done).length;
    out.push({ date: k, count: done });
  }
  return out;
}

/** 某张表在日期区间内的记录（用于成长回顾聚合） */
async function inRange<T extends { date: string }>(
  table: { toArray(): Promise<T[]> },
  start: string,
  end: string
): Promise<T[]> {
  const all = await table.toArray();
  return all.filter((r) => r.date >= start && r.date <= end);
}

export interface PeriodStat {
  start: string;
  end: string;
  exerciseCount: number;
  exerciseMinutes: number;
  readingCount: number;
  readingMinutes: number;
  researchCount: number;
  researchMinutes: number;
  englishCount: number;
  experimentCount: number;
  gratitudeCount: number;
  literatureCount: number;
  checkinDays: number; // 有勾选完成的天数
  avgCompletion: number; // 平均完成率 0-1
}

/** 周期（周/月）汇总统计 */
export async function getPeriodStat(start: string, end: string): Promise<PeriodStat> {
  const [ex, rd, rs, en, exp, gr, lit, tasks] = await Promise.all([
    inRange<ExerciseRecord>(db.exercise, start, end),
    inRange<ReadingRecord>(db.reading, start, end),
    inRange<ResearchRecord>(db.research, start, end),
    inRange<EnglishRecord>(db.english, start, end),
    inRange<ExperimentRecord>(db.experiment, start, end),
    inRange<GratitudeRecord>(db.gratitude, start, end),
    inRange<LiteratureItem>(db.literature, start, end),
    db.dailyTasks.toArray(),
  ]);
  const sumMin = <T extends { duration?: number }>(a: T[]) =>
    a.reduce((s, x) => s + (x.duration || 0), 0);
  const periodTasks = tasks.filter((t) => t.date >= start && t.date <= end && t.done);
  const daysWithTask = new Set(periodTasks.map((t) => t.date));
  // 该周期内理论应打卡天数
  const totalDays =
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  const avgCompletion = totalDays ? daysWithTask.size / totalDays : 0;

  return {
    start,
    end,
    exerciseCount: ex.length,
    exerciseMinutes: sumMin(ex),
    readingCount: rd.length,
    readingMinutes: sumMin(rd),
    researchCount: rs.length,
    researchMinutes: sumMin(rs),
    englishCount: en.length,
    experimentCount: exp.length,
    gratitudeCount: gr.length,
    literatureCount: lit.length,
    checkinDays: daysWithTask.size,
    avgCompletion,
  };
}

/** 过去 N 天各模块是否有记录的日期集合（用于连续打卡计算）。接受 repo 或 Dexie 表。 */
export async function datesByTable(table: {
  all(): Promise<{ date: string }[]>;
}): Promise<string[]> {
  const rows = await table.all();
  return Array.from(new Set(rows.map((r) => r.date)));
}

/** 简易周趋势：返回最近 7 天每天的某数值（用于运动周趋势图） */
export async function lastNDailyCount(
  table: { toArray(): Promise<{ date: string }[]> },
  days = 7
): Promise<{ date: string; value: number }[]> {
  const rows = await table.toArray();
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) || 0) + 1);
  const out: { date: string; value: number }[] = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const k = todayKey(d);
    out.push({ date: k, value: byDate.get(k) || 0 });
  }
  return out;
}

/* ===================== 记账 ===================== */

/** 从自由文本中提取全部数字并求和（如「午餐5 晚餐10」→ 15）。无数字返回 0。 */
export function extractAmount(text: string): number {
  const matches = text.match(/-?\d+(\.\d+)?/g);
  if (!matches) return 0;
  const sum = matches.reduce((s, m) => s + parseFloat(m), 0);
  return Math.round(sum * 100) / 100;
}

export interface AccountTotals {
  income: number; // 总收入
  expense: number; // 总支出
  balance: number; // 结余 = 收入 - 支出
}

/** 全部记账汇总（总收入 / 总支出 / 结余） */
export async function getAccountTotals(): Promise<AccountTotals> {
  const all = (await repos.account.all()) as AccountRecord[];
  return sumAccount(all);
}

function sumAccount(rows: AccountRecord[]): AccountTotals {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  }
  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  return { income, expense, balance: Math.round((income - expense) * 100) / 100 };
}

/** 指定年月（YYYY-MM）的记账汇总 */
export async function getAccountMonthTotals(
  monthPrefix: string
): Promise<AccountTotals> {
  const all = (await repos.account.all()) as AccountRecord[];
  return sumAccount(all.filter((r) => r.date.startsWith(monthPrefix)));
}

export interface AccountDaySum {
  date: string;
  income: number; // 当日收入合计
  expense: number; // 当日支出合计
}

/** 指定年月内，每日收支合计（仅含该月有记录的日子） */
export async function getAccountDailyMap(
  monthPrefix: string
): Promise<Record<string, AccountDaySum>> {
  const all = (await repos.account.all()) as AccountRecord[];
  const map: Record<string, AccountDaySum> = {};
  for (const r of all) {
    if (!r.date.startsWith(monthPrefix)) continue;
    const d = (map[r.date] ??= { date: r.date, income: 0, expense: 0 });
    if (r.type === "income") d.income += r.amount;
    else d.expense += r.amount;
  }
  for (const k of Object.keys(map)) {
    map[k].income = Math.round(map[k].income * 100) / 100;
    map[k].expense = Math.round(map[k].expense * 100) / 100;
  }
  return map;
}

/** 某一天的全部记账记录（用于日历点击弹窗） */
export async function getAccountByDate(date: string): Promise<AccountRecord[]> {
  const rows = (await repos.account.whereDate(date)) as AccountRecord[];
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}
