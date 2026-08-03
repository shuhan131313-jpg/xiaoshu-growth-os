import Dexie, { type Table, type UpdateSpec } from "dexie";
import { db } from "./db";

/** 通用 CRUD 工厂：所有模块共用，避免重复样板 */
export function repo<T>(table: Table<T, number>) {
  return {
    all: () => table.toArray(),
    whereDate: (date: string) => table.where("date").equals(date).toArray(),
    get: (id: number) => table.get(id),
    add: (item: T) => table.add(item),
    put: (item: T) => table.put(item),
    update: (id: number, patch: Partial<T>) =>
      table.update(id, patch as UpdateSpec<T>),
    delete: (id: number) => table.delete(id),
    clear: () => table.clear(),
  };
}

export const repos = {
  dailyTasks: repo(db.dailyTasks),
  exercise: repo(db.exercise),
  reading: repo(db.reading),
  english: repo(db.english),
  meditation: repo(db.meditation),
  research: repo(db.research),
  literature: repo(db.literature),
  experiment: repo(db.experiment),
  gratitude: repo(db.gratitude),
  spark: repo(db.spark),
  growth: repo(db.growth),
  settings: repo(db.settings),
};

export type Repo = ReturnType<typeof repo>;
