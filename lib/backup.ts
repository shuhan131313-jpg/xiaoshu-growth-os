import { db } from "./db/db";
import { BACKUP_TABLE_NAMES, rowsFromBackup, type BackupData } from "./backup-format";

type AnyTable = {
  toArray(): Promise<unknown[]>;
  clear(): Promise<void>;
  bulkAdd(rows: unknown[]): Promise<unknown>;
};

const dbTables = db as unknown as Record<string, AnyTable>;

/** 导出全部数据为 JSON 字符串 */
export async function exportAll(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const name of BACKUP_TABLE_NAMES) {
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
  for (const name of BACKUP_TABLE_NAMES) {
    const rows = rowsFromBackup(data, name);
    const table = dbTables[name];
    await table.clear();
    if (rows.length) await table.bulkAdd(rows);
  }
}

export type BackupExportResult = "saved" | "shared" | "downloaded" | "cancelled" | "failed";

function backupFilename(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `树_备份_${date}_${time}.json`;
}

/** 在桌面与 Android/PWA 中按能力选择保存、分享或下载方式。 */
export async function downloadBackup(json: string): Promise<BackupExportResult> {
  const blob = new Blob([json], { type: "application/json" });
  const filename = backupFilename();

  const picker = (window as Window & {
    showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: filename, types: [{ description: "JSON 备份", accept: { "application/json": [".json"] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  const share = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  const file = new File([blob], filename, { type: "application/json" });
  if (share.share && share.canShare?.({ files: [file] })) {
    try {
      await share.share({ title: "树备份", files: [file] });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

export async function copyBackup(json: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = json;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
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
