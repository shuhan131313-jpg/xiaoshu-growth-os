import { db } from "./db/db";
import type { MilestoneRecord } from "./db/db";

export async function addMilestone(
  date: string,
  title: string,
  note?: string
): Promise<MilestoneRecord> {
  const now = Date.now();
  const record: MilestoneRecord = {
    date,
    title: title.trim(),
    note: note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  if (!record.title) throw new Error("里程碑标题不能为空");
  const id = await db.milestones.add(record);
  return { ...record, id };
}

export async function updateMilestone(
  id: number,
  date: string,
  title: string,
  note?: string
): Promise<MilestoneRecord> {
  const existing = await db.milestones.get(id);
  if (!existing) throw new Error("找不到要修改的里程碑");

  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("里程碑标题不能为空");

  const changes = {
    date,
    title: cleanTitle,
    note: note?.trim() || undefined,
    updatedAt: Date.now(),
  };
  await db.milestones.update(id, changes);
  return { ...existing, ...changes, id };
}
