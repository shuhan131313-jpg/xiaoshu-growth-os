import { getMeta, setMeta } from "./growth";

export const TAROT_PROGRESS_KEY = "tarot-progress-v1";

export type TarotMastery = "new" | "learning" | "due" | "mastered";
export type TarotRecallRating = "forgot" | "fuzzy" | "remembered";

export interface TarotCardProgress {
  status: TarotMastery;
  learnedAt?: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  reviewCount: number;
  recallRating?: TarotRecallRating;
}

export interface TarotProgress {
  cards: Record<string, TarotCardProgress>;
  notes: Record<string, { symbols?: string; upright?: string; reversed?: string; cases?: string }>;
  recallAnswers: Record<string, string>;
}

export function emptyTarotProgress(): TarotProgress {
  return { cards: {}, notes: {}, recallAnswers: {} };
}

export async function getTarotProgress(): Promise<TarotProgress> {
  const stored = await getMeta<Partial<TarotProgress>>(TAROT_PROGRESS_KEY, {});
  return {
    cards: stored.cards ?? {},
    notes: stored.notes ?? {},
    recallAnswers: stored.recallAnswers ?? {},
  };
}

export function dueReviewCount(progress: TarotProgress, now = Date.now()): number {
  return Object.values(progress.cards).filter((card) => card.nextReviewAt != null && card.nextReviewAt <= now).length;
}

export function masteryCount(progress: TarotProgress): number {
  return Object.values(progress.cards).filter((card) => card.status === "mastered").length;
}

export function nextReviewAtFor(rating: TarotRecallRating, now = Date.now(), previousCount = 0): number {
  const intervals = rating === "forgot" ? [0, 1, 1, 3] : rating === "fuzzy" ? [1, 3, 7, 14] : [1, 3, 7, 14, 30];
  const days = intervals[Math.min(previousCount, intervals.length - 1)];
  return now + days * 24 * 60 * 60 * 1000;
}

export async function saveTarotProgress(progress: TarotProgress): Promise<void> {
  await setMeta(TAROT_PROGRESS_KEY, progress);
}

