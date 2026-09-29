import Dexie from "dexie";
import { db } from "./db/db";
import type {
  ExerciseRecord,
  ExperimentRecord,
  FoodRecord,
  LeavesEntry,
  LeavesSourceType,
  ResearchRecord,
} from "./db/db";
import {
  DAILY_LEAVES,
  FOOD_UNPLANNED_DEDUCTION,
  LEAVES_ACTIVATED_AT_KEY,
  dailyRewardKey,
  foodUnplannedDeductionKey,
  foodUnplannedDeleteDelta,
  foodUnplannedReversalKey,
  foodUnplannedTransitionDelta,
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

export interface FoodLeavesResult {
  record: FoodRecord;
  leavesDelta: number;
}

async function activeFoodDeduction(sourceId: string): Promise<LeavesEntry | undefined> {
  const entries = await db.leaves.where("sourceId").equals(sourceId).toArray();
  const reversed = new Set(
    entries
      .filter((entry) => entry.sourceType === "food_unplanned_reversal" && entry.reversalOf != null)
      .map((entry) => entry.reversalOf)
  );
  return entries
    .filter((entry) => entry.sourceType === "food_unplanned" && entry.id != null)
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .find((entry) => !reversed.has(entry.id));
}

async function deductForUnplannedFood(
  record: FoodRecord & { id: number },
  occurredAt: number
): Promise<number> {
  const sourceId = String(record.id);
  const entries = await db.leaves.where("sourceId").equals(sourceId).toArray();
  const cycle = entries.filter((entry) => entry.sourceType === "food_unplanned").length + 1;
  const entryId = await addAutomaticEntry(
    "food_unplanned",
    sourceId,
    foodUnplannedDeductionKey(sourceId, cycle),
    record.date,
    `计划外饮食 · ${record.content}`,
    -FOOD_UNPLANNED_DEDUCTION,
    occurredAt
  );
  return entryId == null ? 0 : -FOOD_UNPLANNED_DEDUCTION;
}

async function reverseUnplannedFood(
  record: FoodRecord & { id: number },
  occurredAt: number
): Promise<number> {
  const original = await activeFoodDeduction(String(record.id));
  if (!original?.id) return 0;
  const entryId = await addUniqueEntry({
    occurredAt,
    date: todayKey(new Date(occurredAt)),
    sourceType: "food_unplanned_reversal",
    sourceId: String(record.id),
    sourceKey: foodUnplannedReversalKey(original.id),
    description: `恢复计划外饮食 · ${record.content}`,
    amount: FOOD_UNPLANNED_DEDUCTION,
    mode: "automatic",
    reversalOf: original.id,
  });
  return entryId == null ? 0 : FOOD_UNPLANNED_DEDUCTION;
}

/** 新增饮食与对应扣分在同一事务中完成；普通饮食不会产生流水。 */
export async function addFoodRecordWithLeaves(record: FoodRecord): Promise<FoodLeavesResult> {
  return db.transaction("rw", db.foodRecords, db.settings, db.leaves, async () => {
    const id = await db.foodRecords.add(record);
    const saved = { ...record, id };
    const leavesDelta = record.isUnplanned
      ? await deductForUnplannedFood(saved, record.createdAt)
      : 0;
    return { record: saved, leavesDelta };
  });
}

/** 编辑文字不重复扣分；只有普通/计划外状态发生变化时才新增扣分或恢复流水。 */
export async function updateFoodRecordWithLeaves(
  id: number,
  patch: Pick<FoodRecord, "content" | "isUnplanned" | "updatedAt">
): Promise<FoodLeavesResult> {
  return db.transaction("rw", db.foodRecords, db.settings, db.leaves, async () => {
    const existing = await db.foodRecords.get(id);
    if (!existing) throw new Error("找不到这条饮食记录");
    const record = { ...existing, ...patch, id };
    await db.foodRecords.put(record);

    const hasActiveDeduction = (await activeFoodDeduction(String(id))) != null;
    const transitionDelta = foodUnplannedTransitionDelta(
      existing.isUnplanned,
      record.isUnplanned,
      hasActiveDeduction
    );
    let leavesDelta = 0;
    if (transitionDelta < 0) {
      leavesDelta = await deductForUnplannedFood(record, patch.updatedAt);
    } else if (transitionDelta > 0) {
      leavesDelta = await reverseUnplannedFood(existing as FoodRecord & { id: number }, patch.updatedAt);
    }
    return { record, leavesDelta };
  });
}

/** 删除已实际扣分的计划外饮食时先写入恢复流水，再删除业务记录。 */
export async function deleteFoodRecordWithLeaves(id: number): Promise<number> {
  const now = Date.now();
  return db.transaction("rw", db.foodRecords, db.settings, db.leaves, async () => {
    const existing = await db.foodRecords.get(id);
    if (!existing) return 0;
    const hasActiveDeduction = (await activeFoodDeduction(String(id))) != null;
    const leavesDelta = foodUnplannedDeleteDelta(existing.isUnplanned, hasActiveDeduction) > 0
      ? await reverseUnplannedFood(existing as FoodRecord & { id: number }, now)
      : 0;
    await db.foodRecords.delete(id);
    return leavesDelta;
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
