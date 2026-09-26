export interface FoodRecordData {
  date: string;
  content: string;
  isUnplanned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type FoodRecordLike = FoodRecordData & { id?: number };

export interface FoodDayGroup<T extends FoodRecordLike = FoodRecordLike> {
  date: string;
  records: T[];
  total: number;
  unplanned: number;
}

/** 使用用户设备的本地年月日，避免 UTC 转换让记录跨到前一天或后一天。 */
export function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createFoodRecordData(
  content: string,
  isUnplanned: boolean,
  now = Date.now()
): FoodRecordData {
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("饮食内容不能为空");
  return {
    date: localDateKey(now),
    content: cleanContent,
    isUnplanned,
    createdAt: now,
    updatedAt: now,
  };
}

/** 编辑只更新内容与更新时间，原始时间和日期归属保持不变。 */
export function editFoodRecordData<T extends FoodRecordLike>(
  record: T,
  content: string,
  now = Date.now()
): T {
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("饮食内容不能为空");
  return { ...record, content: cleanContent, updatedAt: now };
}

export function sortFoodRecords<T extends FoodRecordLike>(records: T[]): T[] {
  return [...records].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.createdAt - right.createdAt ||
      (left.id ?? 0) - (right.id ?? 0)
  );
}

/** 历史仅在展示层按本地日期分组，底层记录保持逐条独立。 */
export function groupFoodRecordsByDay<T extends FoodRecordLike>(records: T[]): FoodDayGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const record of sortFoodRecords(records)) {
    const current = groups.get(record.date) ?? [];
    current.push(record);
    groups.set(record.date, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, dayRecords]) => ({
      date,
      records: dayRecords,
      total: dayRecords.length,
      unplanned: dayRecords.filter((record) => record.isUnplanned).length,
    }));
}

export function foodDaySummary(records: FoodRecordLike[]): { total: number; unplanned: number } {
  return {
    total: records.length,
    unplanned: records.filter((record) => record.isUnplanned).length,
  };
}

export function formatFoodTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatFoodDate(date: string, includeYear = false): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return includeYear ? `${year}年${month}月${day}日` : `${month}月${day}日`;
}
