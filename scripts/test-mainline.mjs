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

const { MAINLINE_CATEGORIES } = await importTypeScript("../lib/mainline-rules.ts");
const { BACKUP_TABLE_NAMES, rowsFromBackup } = await importTypeScript("../lib/backup-format.ts");

assert.deepEqual(MAINLINE_CATEGORIES, [
  "论文",
  "投稿",
  "修稿",
  "实验",
  "写作",
  "杂事",
  "休息",
  "空白",
]);
assert.equal(new Set(MAINLINE_CATEGORIES).size, 8, "主线分类不得重复");
assert.equal(BACKUP_TABLE_NAMES.includes("dailyMain"), true, "备份必须包含主线记录");
assert.equal(BACKUP_TABLE_NAMES.includes("milestones"), true, "备份必须包含里程碑");
assert.deepEqual(rowsFromBackup({ tables: {} }, "dailyMain"), [], "老备份缺少主线时应恢复为空");
assert.deepEqual(rowsFromBackup({ tables: {} }, "milestones"), [], "老备份缺少里程碑时应恢复为空");
assert.deepEqual(
  rowsFromBackup({ tables: { dailyMain: [{ date: "2026-09-22" }] } }, "dailyMain"),
  [{ date: "2026-09-22" }]
);
assert.deepEqual(
  rowsFromBackup({ tables: { milestones: [{ title: "第一次投稿" }] } }, "milestones"),
  [{ title: "第一次投稿" }]
);

console.log("主线分类与备份兼容测试通过：8 项");
