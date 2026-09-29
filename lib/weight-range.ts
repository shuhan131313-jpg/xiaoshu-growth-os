import { localDateKey } from "./food-rules";

export type WeightTimeRange = 7 | 30 | "all";

/**
 * 仅按用户本地自然日筛选展示范围，不补日期，也不修改原始记录。
 * 7 天包含今天与此前 6 个本地自然日，30 天同理。
 */
export function filterRecordsByLocalDayRange<T extends { date: string }>(
  records: T[],
  range: WeightTimeRange,
  now = new Date()
): T[] {
  if (range === "all") return records;

  const endDate = localDateKey(now.getTime());
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (range - 1));
  const startDate = localDateKey(start.getTime());

  return records.filter((record) => record.date >= startDate && record.date <= endDate);
}
