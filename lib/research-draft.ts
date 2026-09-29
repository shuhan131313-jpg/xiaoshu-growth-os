import { db } from "./db/db";

export const RESEARCH_DRAFT_KEY = "research.currentSessionSummary";

export async function getResearchDraft(): Promise<string> {
  const entry = await db.settings.where("key").equals(RESEARCH_DRAFT_KEY).first();
  return typeof entry?.value === "string" ? entry.value : "";
}

export async function saveResearchDraft(summary: string): Promise<void> {
  const value = summary.trim();
  const existing = await db.settings.where("key").equals(RESEARCH_DRAFT_KEY).first();
  if (existing?.id != null) {
    await db.settings.update(existing.id, { value });
  } else {
    await db.settings.add({ key: RESEARCH_DRAFT_KEY, value });
  }
}

export async function clearResearchDraft(): Promise<void> {
  const existing = await db.settings.where("key").equals(RESEARCH_DRAFT_KEY).first();
  if (existing?.id != null) await db.settings.delete(existing.id);
}
