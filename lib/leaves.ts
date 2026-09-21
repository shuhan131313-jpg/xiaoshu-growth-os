import Dexie from "dexie";
import { db } from "./db/db";
import type {
  ExerciseRecord,
  ExperimentRecord,
  LeavesEntry,
  LeavesSourceType,
  ResearchRecord,
} from "./db/db";
import {
  DAILY_LEAVES,
  LEAVES_ACTIVATED_AT_KEY,
  dailyRewardKey,
  researchRewardKey,
  researchLeavesForSeconds,
  startOfWeek,
} from "./leaves-rules";
import { todayKey } from "./utils";

async function activatedAtInTransaction(now: number): Promise<number> {
  const existing = await db.settings
    .where("key")
    .equals(LEAVES_ACTIVATED_AT_KEY)
    .first();
  if (existing) return Number(existing.value) || now;
  await db.settings.add({ key: LEAVES_ACTIVATED_AT_KEY, value: now });
  return now;
}

/** 只记录启用边界，不扫描任何旧业务表，也不补发历史积分。 */
export async function ensureLeavesActivated(): Promise<number> {
  const now = Date.now();
  return db.transaction("rw", db.settings, async () => activatedAtInTransaction(now));
}

async function addUniqueEntry(entry: LeavesEntry): Promise<number | null> {
  const existing = await db.leaves.where("sourceKey").equals(entry.sourceKey).first();
  if (existing) return null;
  try {
    return await db.leaves.add(entry);
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) return null;
    throw error;
  }
}

async function addAutomaticEntry(
  sourceType: LeavesSourceType,
  sourceId: string,
  sourceKey: string,
  date: string,
  description: string,
  amount: number,
  occurredAt: number
): Promise<number | null> {
  const boundary = await activatedAtInTransaction(occurredAt);
  if (occurredAt < boundary) return null;
  if (amount === 0) return null;
  return addUniqueEntry({
    occurredAt,
    date,
    sourceType,
    sourceId,
    sourceKey,
    description,
    amount,
    mode: "automatic",
  });
}

/** 首页与阅读页共用：首次完成 +5；取消后扣回，且当天不能反复重新领取。 */
export async function setReadingCompleteWithLeaves(
  date: string,
  done: boolean
): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.dailyTasks, db.settings, db.leaves, async () => {
    await activatedAtInTransaction(now);
    const task = await db.dailyTasks
      .where("date")
      .equals(date)
      .filter((item) => item.key === "reading")
      .first();
    if (task?.id != null) await db.dailyTasks.update(task.id, { done });
    else await db.dailyTasks.add({ date, key: "reading", done });

    const rewardKey = dailyRewardKey("reading", date);
    if (done) {
      await addAutomaticEntry(
        "reading",
        date,
        rewardKey,
        date,
        "阅读",
        DAILY_LEAVES.reading,
        now
      );
      return;
    }

    const reward = await db.leaves.where("sourceKey").equals(rewardKey).first();
    if (reward) {
      await addUniqueEntry({
        occurredAt: now,
        date,
        sourceType: "reading_reversal",
        sourceId: date,
        sourceKey: `auto:reading-reversal:${date}`,
        description: "取消今日阅读",
        amount: -DAILY_LEAVES.reading,
        mode: "automatic",
        reversalOf: reward.id,
      });
    }
  });
}

export async function addExerciseWithLeaves(
  record: ExerciseRecord
): Promise<{ id: number; awarded: number }> {
  return db.transaction("rw", db.exercise, db.settings, db.leaves, async () => {
    const id = await db.exercise.add(record);
    const entryId = await addAutomaticEntry(
      "exercise",
      String(id),
      dailyRewardKey("exercise", record.date),
      record.date,
      "运动",
      DAILY_LEAVES.exercise,
      record.createdAt
    );
    return { id, awarded: entryId == null ? 0 : DAILY_LEAVES.exercise };
  });
}

export async function addExperimentWithLeaves(
  record: ExperimentRecord
): Promise<{ id: number; awarded: number }> {
  return db.transaction("rw", db.experiment, db.settings, db.leaves, async () => {
    const id = await db.experiment.add(record);
    const entryId = await addAutomaticEntry(
      "experiment",
      String(id),
      dailyRewardKey("experiment", record.date),
      record.date,
      "实验记录",
      DAILY_LEAVES.experiment,
      record.createdAt
    );
    return { id, awarded: entryId == null ? 0 : DAILY_LEAVES.experiment };
  });
}

export async function addResearchWithLeaves(
  record: ResearchRecord,
  elapsedSeconds: number,
  rewardEligible = true
): Promise<{ id: number; awarded: number }> {
  return db.transaction("rw", db.research, db.settings, db.leaves, async () => {
    const id = await db.research.add(record);
    const amount = rewardEligible ? researchLeavesForSeconds(elapsedSeconds) : 0;
    const entryId = await addAutomaticEntry(
      "research",
      String(id),
      researchRewardKey(id),
      record.date,
      `论文专注 · ${Math.floor(Math.max(0, elapsedSeconds) / 60)} min`,
      amount,
      record.createdAt
    );
    return { id, awarded: entryId == null ? 0 : amount };
  });
}

export async function addManualDeduction(
  description: string,
  amount: number
): Promise<number> {
  const now = Date.now();
  const value = -Math.abs(Math.round(amount));
  if (!description.trim() || value === 0) throw new Error("请输入扣分原因和数量");
  return db.transaction("rw", db.settings, db.leaves, async () => {
    await activatedAtInTransaction(now);
    return db.leaves.add({
      occurredAt: now,
      date: todayKey(new Date(now)),
      sourceType: "manual_deduction",
      sourceKey: `manual:${now}:${crypto.randomUUID()}`,
      description: description.trim(),
      amount: value,
      mode: "manual",
    });
  });
}

export async function undoManualDeduction(id: number): Promise<boolean> {
  const now = Date.now();
  return db.transaction("rw", db.settings, db.leaves, async () => {
    await activatedAtInTransaction(now);
    const original = await db.leaves.get(id);
    if (!original || original.sourceType !== "manual_deduction" || original.amount >= 0) {
      return false;
    }
    const added = await addUniqueEntry({
      occurredAt: now,
      date: todayKey(new Date(now)),
      sourceType: "manual_undo",
      sourceId: String(id),
      sourceKey: `manual-undo:${id}`,
      description: `撤销 · ${original.description}`,
      amount: Math.abs(original.amount),
      mode: "manual",
      reversalOf: id,
    });
    return added != null;
  });
}

export interface LeavesSummary {
  balance: number;
  todayNet: number;
  weekNet: number;
  bySourceToday: Partial<Record<LeavesSourceType, number>>;
}

export async function getLeavesSummary(now = new Date()): Promise<LeavesSummary> {
  await ensureLeavesActivated();
  const entries = await db.leaves.toArray();
  const today = todayKey(now);
  const weekStart = startOfWeek(now);
  const sum = (rows: LeavesEntry[]) => rows.reduce((total, row) => total + row.amount, 0);
  const todayEntries = entries.filter((entry) => entry.date === today);
  const bySourceToday: LeavesSummary["bySourceToday"] = {};
  for (const entry of todayEntries) {
    bySourceToday[entry.sourceType] = (bySourceToday[entry.sourceType] || 0) + entry.amount;
  }
  return {
    balance: sum(entries),
    todayNet: sum(todayEntries),
    weekNet: sum(entries.filter((entry) => entry.date >= weekStart && entry.date <= today)),
    bySourceToday,
  };
}

export async function getLeavesEntries(): Promise<LeavesEntry[]> {
  await ensureLeavesActivated();
  return db.leaves.orderBy("occurredAt").reverse().toArray();
}
