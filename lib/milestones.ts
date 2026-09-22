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
