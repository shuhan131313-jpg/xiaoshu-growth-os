import { db, type FoodRecord } from "./db/db";
import { createFoodRecordData, editFoodRecordData, sortFoodRecords } from "./food-rules";
import {
  addFoodRecordWithLeaves,
  deleteFoodRecordWithLeaves,
  updateFoodRecordWithLeaves,
  type FoodLeavesResult,
} from "./leaves";

export async function addFoodRecord(
  content: string,
  isUnplanned: boolean,
  now = Date.now()
): Promise<FoodLeavesResult> {
  const record = createFoodRecordData(content, isUnplanned, now);
  return addFoodRecordWithLeaves(record);
}

export async function updateFoodRecord(
  id: number,
  content: string,
  isUnplanned: boolean,
  now = Date.now()
): Promise<FoodLeavesResult> {
  const existing = await db.foodRecords.get(id);
  if (!existing) throw new Error("找不到这条饮食记录");
  const updated = editFoodRecordData(existing, content, now);
  return updateFoodRecordWithLeaves(id, {
    content: updated.content,
    isUnplanned,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteFoodRecord(id: number): Promise<number> {
  return deleteFoodRecordWithLeaves(id);
}

export async function getFoodRecordsForDate(date: string): Promise<FoodRecord[]> {
  const records = await db.foodRecords.where("date").equals(date).toArray();
  return sortFoodRecords(records);
}

export async function getAllFoodRecords(): Promise<FoodRecord[]> {
  return sortFoodRecords(await db.foodRecords.toArray());
}
