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

const { normalizeAccountEdit, sumAccountRecords } = await importTypeScript("../lib/account-rules.ts");
const { BACKUP_TABLE_NAMES, rowsFromBackup } = await importTypeScript("../lib/backup-format.ts");

const original = [
  { id: 1, date: "2026-10-12", type: "expense", amount: 20, note: "午餐", createdAt: 1 },
  { id: 2, date: "2026-10-12", type: "income", amount: 100, note: "稿费", createdAt: 2 },
];
assert.deepEqual(sumAccountRecords(original), { income: 100, expense: 20, balance: 80 });

const expenseChanges = normalizeAccountEdit({
  date: "2026-10-11",
  type: "expense",
  amount: "50",
  note: " 午餐调整 ",
});
assert.deepEqual(expenseChanges, {
  date: "2026-10-11",
  type: "expense",
  amount: 50,
  note: "午餐调整",
});
const afterExpenseEdit = original.map((row) => row.id === 1 ? { ...row, ...expenseChanges } : row);
assert.equal(afterExpenseEdit.length, 2, "修改不得生成重复记录");
assert.equal(afterExpenseEdit[0].id, 1, "修改必须保留原 id");
assert.equal(afterExpenseEdit[0].createdAt, 1, "修改必须保留 createdAt");
assert.deepEqual(sumAccountRecords(afterExpenseEdit), { income: 100, expense: 50, balance: 50 });

const noteOnlyChanges = normalizeAccountEdit({
  date: original[1].date,
  type: "income",
  amount: original[1].amount,
  note: "新备注",
});
const afterNoteEdit = afterExpenseEdit.map((row) => row.id === 2 ? { ...row, ...noteOnlyChanges } : row);
assert.deepEqual(sumAccountRecords(afterNoteEdit), { income: 100, expense: 50, balance: 50 });

const typeChanges = normalizeAccountEdit({ date: "2026-10-12", type: "expense", amount: 100, note: "转为支出" });
const afterTypeEdit = afterExpenseEdit.map((row) => row.id === 2 ? { ...row, ...typeChanges } : row);
assert.deepEqual(sumAccountRecords(afterTypeEdit), { income: 0, expense: 150, balance: -150 });

assert.equal(normalizeAccountEdit({ date: "", type: "expense", amount: 20 }), null);
assert.equal(normalizeAccountEdit({ date: "2026-10-12", type: "expense", amount: 0 }), null);
assert.equal(normalizeAccountEdit({ date: "2026-10-12", type: "expense", amount: "abc" }), null);
assert.equal(BACKUP_TABLE_NAMES.includes("account"), true, "备份必须继续包含记账表");
assert.deepEqual(rowsFromBackup({ tables: {} }, "account"), [], "老备份缺少记账表时应按空数组处理");
assert.deepEqual(rowsFromBackup({ tables: { account: original } }, "account"), original);

console.log("记账编辑、余额重算、原 ID 保留与备份兼容测试通过：12 项");
