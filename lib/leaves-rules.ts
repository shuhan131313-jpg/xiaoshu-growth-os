export const LEAVES_ACTIVATED_AT_KEY = "leaves.activatedAt";

export const DAILY_LEAVES = {
  reading: 5,
  exercise: 10,
  experiment: 10,
} as const;

export const FOOD_UNPLANNED_DEDUCTION = 20;

export function researchLeavesForSeconds(elapsedSeconds: number): number {
  return Math.floor(Math.max(0, elapsedSeconds) / 600) * 5;
}

export function dailyRewardKey(
  source: "reading" | "exercise" | "experiment",
  date: string
): string {
  return `auto:${source}:${date}`;
}

export function researchRewardKey(sourceId: string | number): string {
  return `auto:research:${sourceId}`;
}

export function foodUnplannedDeductionKey(
  sourceId: string | number,
  cycle: number
): string {
  return `auto:food-unplanned:${sourceId}:${cycle}`;
}

export function foodUnplannedReversalKey(entryId: string | number): string {
  return `auto:food-unplanned-reversal:${entryId}`;
}

export function foodUnplannedTransitionDelta(
  wasUnplanned: boolean,
  isUnplanned: boolean,
  hasActiveDeduction: boolean
): number {
  if (!wasUnplanned && isUnplanned) return -FOOD_UNPLANNED_DEDUCTION;
  if (wasUnplanned && !isUnplanned && hasActiveDeduction) return FOOD_UNPLANNED_DEDUCTION;
  return 0;
}

export function foodUnplannedDeleteDelta(
  isUnplanned: boolean,
  hasActiveDeduction: boolean
): number {
  return isUnplanned && hasActiveDeduction ? FOOD_UNPLANNED_DEDUCTION : 0;
}

export function startOfWeek(date: Date): string {
  const start = new Date(date);
  const day = start.getDay();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${mm}-${dd}`;
}
