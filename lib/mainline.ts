import { db } from "./db/db";
import type { DailyMainRecord, MainlineCategory } from "./db/db";
export { MAINLINE_CATEGORIES } from "./mainline-rules";

export async function getDailyMain(date: string): Promise<DailyMainRecord | undefined> {
  return db.dailyMain.where("date").equals(date).first();
}

/** 按日期更新或新增，数据库唯一日期索引提供第二层重复保护。 */
export async function saveDailyMain(
  date: string,
  category: MainlineCategory,
  note?: string
): Promise<DailyMainRecord> {
  const now = Date.now();
  const cleanNote = note?.trim() || undefined;
  return db.transaction("rw", db.dailyMain, async () => {
    const existing = await db.dailyMain.where("date").equals(date).first();
    if (existing?.id != null) {
      await db.dailyMain.update(existing.id, {
        category,
        note: cleanNote,
        updatedAt: now,
      });
      return {
        ...existing,
        category,
        note: cleanNote,
        updatedAt: now,
      };
    }
    const record: DailyMainRecord = {
      date,
      category,
      note: cleanNote,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.dailyMain.add(record);
    return { ...record, id };
  });
}
