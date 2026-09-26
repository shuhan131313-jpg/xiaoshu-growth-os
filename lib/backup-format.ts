export const BACKUP_TABLE_NAMES = [
  "dailyTasks",
  "exercise",
  "reading",
  "english",
  "research",
  "literature",
  "experiment",
  "gratitude",
  "spark",
  "weight",
  "bowel",
  "favorite",
  "growth",
  "settings",
  "account",
  "timeThread",
  "timeCell",
  "timeMerge",
  "todo",
  "leaves",
  "dailyMain",
  "milestones",
  "foodRecords",
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

export interface BackupData {
  version: 1;
  app: string;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** 老备份没有新表时按空数组处理，保证新增功能向后兼容。 */
export function rowsFromBackup(
  data: Pick<BackupData, "tables">,
  name: BackupTableName
): unknown[] {
  const rows = data.tables?.[name];
  return Array.isArray(rows) ? rows : [];
}
