import { db, type FoodRecord } from "./db/db";
import { createFoodRecordData, editFoodRecordData, sortFoodRecords } from "./food-rules";

export async function addFoodRecord(
  content: string,
  isUnplanned: boolean,
  now = Date.now()
): Promise<FoodRecord> {
  const record = createFoodRecordData(content, isUnplanned, now);
  const id = await db.foodRecords.add(record);
  return { ...record, id };
}

export async function updateFoodRecord(
  id: number,
  content: string,
  now = Date.now()
): Promise<FoodRecord> {
  const existing = await db.foodRecords.get(id);
  if (!existing) throw new Error("找不到这条饮食记录");
  const updated = editFoodRecordData(existing, content, now);
  await db.foodRecords.put(updated);
  return updated;
}

export async function deleteFoodRecord(id: number): Promise<void> {
  await db.foodRecords.delete(id);
}

export async function getFoodRecordsForDate(date: string): Promise<FoodRecord[]> {
  const records = await db.foodRecords.where("date").equals(date).toArray();
  return sortFoodRecords(records);
}

export async function getAllFoodRecords(): Promise<FoodRecord[]> {
  return sortFoodRecords(await db.foodRecords.toArray());
}
