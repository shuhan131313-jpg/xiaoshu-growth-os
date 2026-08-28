import { db } from "./db/db";

/** 简易 key-value 元数据存储（复用 settings 表，随 JSON 备份导出/导入） */
export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.where("key").equals(key).first();
  return row ? (row.value as T) : fallback;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const row = await db.settings.where("key").equals(key).first();
  if (row?.id != null) {
    await db.settings.update(row.id, { value });
  } else {
    await db.settings.add({ key, value });
  }
}

/** 成长进度条：小树迈向浙大校门，总刻度 */
export const GROWTH_TOTAL = 200;

export async function getGrowthStep(): Promise<number> {
  return getMeta<number>("growthStep", 0);
}

/** 前进一步（封顶 GROWTH_TOTAL），返回最新步数 */
export async function bumpGrowthStep(): Promise<number> {
  const cur = await getGrowthStep();
  const next = Math.min(GROWTH_TOTAL, cur + 1);
  await setMeta("growthStep", next);
  return next;
}

/** 每日内容（英文/书摘）当日锁定，避免每次打开随机刷新 */
export async function getDailyPick<T>(
  prefix: string,
  pool: T[],
  matchKey: (item: T, v: string) => boolean,
  fallback: T
): Promise<T> {
  const saved = await getMeta<string>(`daily:${prefix}:${todayStr()}`, "");
  if (saved) {
    const found = pool.find((x) => matchKey(x, saved));
    if (found) return found;
  }
  return fallback;
}

export async function setDailyPick(prefix: string, value: string): Promise<void> {
  await setMeta(`daily:${prefix}:${todayStr()}`, value);
}

function todayStr(): string {
  const d = new Date();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
