import { db, type FoodRecord } from "./db/db";
import { createFoodRecordData, editFoodRecordData, sortFoodRecords } from "./food-rules";

export const FOOD_DAY_MARKERS = {
  protein: "蛋白质达标",
  water: "水达标",
} as const;

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
  isUnplanned: boolean,
  now = Date.now()
): Promise<FoodRecord> {
  const existing = await db.foodRecords.get(id);
  if (!existing) throw new Error("找不到这条饮食记录");
  const updated = editFoodRecordData(existing, content, now);
  await db.foodRecords.update(id, {
    content: updated.content,
    isUnplanned,
    updatedAt: updated.updatedAt,
  });
  return { ...existing, ...updated, id, isUnplanned };
}

export async function deleteFoodRecord(id: number): Promise<void> {
  await db.foodRecords.delete(id);
}

export async function getFoodRecordsForDate(date: string): Promise<FoodRecord[]> {
  await migrateLegacyDayMarkers(date);
  const records = await db.foodRecords.where("date").equals(date).toArray();
  return sortFoodRecords(records);
}

export async function getAllFoodRecords(): Promise<FoodRecord[]> {
  const legacyRows = await db.settings.toArray();
  for (const row of legacyRows) {
    if (row.key.startsWith("food-day-status:")) {
      await migrateLegacyDayMarkers(row.key.slice("food-day-status:".length));
    }
  }
  return sortFoodRecords(await db.foodRecords.toArray());
}

/** 将旧版按天布尔提醒安全转换为普通饮食记录，旧记录不重复生成。 */
export async function migrateLegacyDayMarkers(date: string): Promise<void> {
  const key = `food-day-status:${date}`;
  await db.transaction("rw", db.foodRecords, db.settings, async () => {
    const setting = await db.settings.where("key").equals(key).first();
    if (!setting?.value || typeof setting.value !== "object") return;
    const status = setting.value as { protein?: unknown; water?: unknown };
    const existing = await db.foodRecords.where("date").equals(date).toArray();
    const now = Date.now();
    const next = { protein: false, water: false };
    for (const field of ["protein", "water"] as const) {
      if (status[field] === true) {
        const content = FOOD_DAY_MARKERS[field];
        if (!existing.some((record) => record.content === content && !record.isUnplanned)) {
          await db.foodRecords.add(createFoodRecordData(content, false, now));
        }
      }
    }
    await db.settings.update(setting.id!, { value: next });
  });
}

export async function getFoodDayMarkerState(date: string): Promise<{ protein: boolean; water: boolean }> {
  await migrateLegacyDayMarkers(date);
  const records = await db.foodRecords.where("date").equals(date).toArray();
  return {
    protein: records.some((record) => record.content === FOOD_DAY_MARKERS.protein && !record.isUnplanned),
    water: records.some((record) => record.content === FOOD_DAY_MARKERS.water && !record.isUnplanned),
  };
}

export async function toggleFoodDayMarker(date: string, field: keyof typeof FOOD_DAY_MARKERS): Promise<FoodRecord | null> {
  await migrateLegacyDayMarkers(date);
  const content = FOOD_DAY_MARKERS[field];
  return db.transaction("rw", db.foodRecords, async () => {
    const existing = (await db.foodRecords.where("date").equals(date).toArray())
      .find((record) => record.content === content && !record.isUnplanned);
    if (existing?.id != null) {
      await db.foodRecords.delete(existing.id);
      return null;
    }
    const now = Date.now();
    const record = createFoodRecordData(content, false, now);
    const id = await db.foodRecords.add(record);
    return { ...record, id };
  });
}
