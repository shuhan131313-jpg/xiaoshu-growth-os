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
  "recentBooks",
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

export interface BackupData {
  version: 1;
  app: string;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export function validateBackupData(value: unknown): BackupData {
  if (!value || typeof value !== "object") throw new Error("备份内容不是 JSON 对象");
  const data = value as Partial<BackupData>;
  if (data.version !== 1) throw new Error("不支持的备份版本");
  if (!data.tables || typeof data.tables !== "object" || Array.isArray(data.tables)) {
    throw new Error("备份缺少有效的数据表");
  }
  for (const name of BACKUP_TABLE_NAMES) {
    const rows = (data.tables as Record<string, unknown>)[name];
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`备份表 ${name} 格式不正确`);
  }
  return {
    version: 1,
    app: typeof data.app === "string" ? data.app : "xiaoshu-growth-os",
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
    tables: data.tables as Record<string, unknown[]>,
  };
}

/** 老备份没有新表时按空数组处理，保证新增功能向后兼容。 */
export function rowsFromBackup(
  data: Pick<BackupData, "tables">,
  name: BackupTableName
): unknown[] {
  const rows = data.tables?.[name];
  return Array.isArray(rows) ? rows : [];
}
