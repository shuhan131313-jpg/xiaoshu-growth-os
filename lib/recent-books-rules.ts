export type RecentBookStatus = "reading" | "finished";

export interface RecentBookInput {
  title: string;
  note?: string;
  status: RecentBookStatus;
  updatedAt: number;
}

export function normalizeRecentBookInput(
  title: string,
  note: string,
  status: RecentBookStatus,
  now = Date.now()
): RecentBookInput {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("请填写书名");
  const cleanNote = note.trim();
  return {
    title: cleanTitle,
    note: cleanNote || undefined,
    status,
    updatedAt: now,
  };
}

export function sortRecentBooks<T extends { status: RecentBookStatus; updatedAt: number }>(
  books: T[]
): T[] {
  return [...books].sort((a, b) => {
    if (a.status !== b.status) return a.status === "reading" ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}
