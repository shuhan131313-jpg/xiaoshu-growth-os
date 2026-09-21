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

const rules = await importTypeScript("../lib/leaves-rules.ts");
const { dailyRewardKey, researchLeavesForSeconds, researchRewardKey, startOfWeek } = rules;
const backup = await importTypeScript("../lib/backup-format.ts");
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

const cases = [
  [7, 0],
  [9, 0],
  [10, 5],
  [19, 5],
  [20, 10],
  [41, 20],
  [47, 20],
  [59, 25],
  [60, 30],
  [62, 30],
];

for (const [minutes, expected] of cases) {
  assert.equal(
    researchLeavesForSeconds(minutes * 60),
    expected,
    `${minutes} 分钟应获得 ${expected} 树叶`
  );
}

assert.equal(researchLeavesForSeconds(9 * 60 + 59), 0, "不足完整 10 分钟不得进位");
assert.equal(researchLeavesForSeconds(47 * 60 + 59), 20, "不足下一档的秒数直接舍去");
assert.equal(dailyRewardKey("reading", "2026-09-21"), "auto:reading:2026-09-21");
assert.equal(dailyRewardKey("exercise", "2026-09-21"), "auto:exercise:2026-09-21");
assert.notEqual(researchRewardKey(101), researchRewardKey(102), "不同论文 session 必须独立结算");
assert.equal(researchRewardKey(101), researchRewardKey(101), "同一论文 session 必须保持相同幂等键");
assert.equal(startOfWeek(new Date("2026-09-21T09:00:00+08:00")), "2026-09-21");
assert.equal(startOfWeek(new Date("2026-09-27T09:00:00+08:00")), "2026-09-21");
assert.equal(BACKUP_TABLE_NAMES.includes("leaves"), true, "新版备份必须包含树叶流水");
assert.deepEqual(rowsFromBackup({ tables: {} }, "leaves"), [], "旧备份缺少树叶表时应恢复为空");
assert.deepEqual(
  rowsFromBackup({ tables: { leaves: [{ amount: 5 }] } }, "leaves"),
  [{ amount: 5 }],
  "新版备份应保留树叶流水"
);

console.log(`树叶规则与备份兼容测试通过：${cases.length + 11} 项`);
