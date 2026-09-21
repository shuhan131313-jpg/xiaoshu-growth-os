export const LEAVES_ACTIVATED_AT_KEY = "leaves.activatedAt";

export const DAILY_LEAVES = {
  reading: 5,
  exercise: 10,
  experiment: 10,
} as const;

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

export function startOfWeek(date: Date): string {
  const start = new Date(date);
  const day = start.getDay();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${mm}-${dd}`;
}
