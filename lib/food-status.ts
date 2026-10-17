import { db } from "./db/db";

export interface FoodDayStatus {
  protein: boolean;
  water: boolean;
}

function keyFor(date: string): string {
  return `food-day-status:${date}`;
}

function normalize(value: unknown): FoodDayStatus {
  if (!value || typeof value !== "object") return { protein: false, water: false };
  const source = value as Partial<FoodDayStatus>;
  return { protein: source.protein === true, water: source.water === true };
}

export async function getFoodDayStatus(date: string): Promise<FoodDayStatus> {
  const row = await db.settings.where("key").equals(keyFor(date)).first();
  return normalize(row?.value);
}

export async function setFoodDayStatus(
  date: string,
  patch: Partial<FoodDayStatus>
): Promise<FoodDayStatus> {
  const key = keyFor(date);
  return db.transaction("rw", db.settings, async () => {
    const row = await db.settings.where("key").equals(key).first();
    const current = normalize(row?.value);
    const next = { ...current, ...patch };
    if (row?.id != null) {
      await db.settings.update(row.id, { value: next });
    } else {
      await db.settings.add({ key, value: next });
    }
    return next;
  });
}
