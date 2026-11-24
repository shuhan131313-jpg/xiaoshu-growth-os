export function validManualMinutes(value: string | number): number | null {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.max(1, Math.round(minutes));
}
