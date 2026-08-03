import { db } from "./db/db";

export interface BackupData {
  version: 1;
  app: string;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

const TABLE_NAMES = [
  "dailyTasks",
  "exercise",
  "reading",
  "english",
  "meditation",
  "research",
  "literature",
  "experiment",
  "gratitude",
  "growth",
  "settings",
] as const;

type AnyTable = {
  toArray(): Promise<unknown[]>;
  clear(): Promise<void>;
  bulkAdd(rows: unknown[]): Promise<unknown>;
};

const dbTables = db as unknown as Record<string, AnyTable>;

/** 导出全部数据为 JSON 字符串 */
export async function exportAll(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const name of TABLE_NAMES) {
    tables[name] = await dbTables[name].toArray();
  }
  const data: BackupData = {
    version: 1,
    app: "xiaoshu-growth-os",
    exportedAt: new Date().toISOString(),
    tables,
  };
  return JSON.stringify(data, null, 2);
}

/** 从 JSON 字符串恢复全部数据（先清空再批量写入） */
export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json) as BackupData;
  if (data.version !== 1) throw new Error("不支持的备份版本");
  for (const name of TABLE_NAMES) {
    const rows = (data.tables?.[name] ?? []) as unknown[];
    const table = dbTables[name];
    await table.clear();
    if (rows.length) await table.bulkAdd(rows);
  }
}

/** 浏览器端触发下载 */
export function downloadBackup(json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `xiaoshu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 读取用户选择的文件并返回文本 */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
