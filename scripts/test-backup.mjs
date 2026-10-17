import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const { BACKUP_TABLE_NAMES, validateBackupData, rowsFromBackup } = await importTypeScript("../lib/backup-format.ts");
const settingsSource = await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
const sample = JSON.stringify({ version: 1, app: "xiaoshu-growth-os", exportedAt: new Date().toISOString(), tables: {} });
const parsed = validateBackupData(JSON.parse(sample));
assert.equal(parsed.version, 1, "有效备份应通过版本验证");
assert.deepEqual(rowsFromBackup(parsed, "foodRecords"), [], "旧备份缺少新增表时按空数组恢复");
assert.throws(() => validateBackupData({ version: 1, tables: { settings: {} } }), /格式不正确/);
assert.throws(() => validateBackupData({ version: 2, tables: {} }), /不支持的备份版本/);
assert.ok(BACKUP_TABLE_NAMES.includes("foodRecords"));
assert.match(settingsSource, /保存为 JSON 文件/, "备用文本框提供 JSON 文件保存按钮");
assert.match(settingsSource, /saveFallbackJson/, "保存按钮使用完整备用文本");
console.log("备份 JSON 验证、旧版本兼容、非法结构拒绝与保存入口测试通过：7 项");
