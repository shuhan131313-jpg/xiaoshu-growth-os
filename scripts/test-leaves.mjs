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
const {
  FOOD_UNPLANNED_DEDUCTION,
  dailyRewardKey,
  foodUnplannedDeductionKey,
  foodUnplannedDeleteDelta,
  foodUnplannedReversalKey,
  foodUnplannedTransitionDelta,
  researchLeavesForSeconds,
  researchRewardKey,
  startOfWeek,
} = rules;
const backup = await importTypeScript("../lib/backup-format.ts");
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

const cases = [
  [7, 0],
  [9, 0],
  [10, 5],
  [19, 5],
  [20, 10],
  [35, 15],
  [41, 20],
  [47, 20],
  [59, 25],
  [60, 30],
  [62, 30],
  [80, 40],
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
assert.equal(FOOD_UNPLANNED_DEDUCTION, 20, "每条计划外饮食扣 20 树叶");
assert.equal(foodUnplannedTransitionDelta(false, false, false), 0, "普通饮食编辑不扣分");
assert.equal(foodUnplannedTransitionDelta(false, true, false), -20, "普通改计划外扣 20");
assert.equal(foodUnplannedTransitionDelta(true, true, true), 0, "计划外只改文字不重复扣分");
assert.equal(foodUnplannedTransitionDelta(true, false, true), 20, "计划外改普通恢复 20");
assert.equal(foodUnplannedTransitionDelta(true, false, false), 0, "旧计划外记录没有扣分时不凭空恢复");
assert.equal(foodUnplannedDeleteDelta(true, true), 20, "删除已扣分计划外恢复 20");
assert.equal(foodUnplannedDeleteDelta(false, false), 0, "删除普通饮食不影响树叶");
assert.notEqual(foodUnplannedDeductionKey(9, 1), foodUnplannedDeductionKey(9, 2), "重新改为计划外使用新扣分键");
assert.equal(foodUnplannedReversalKey(8), foodUnplannedReversalKey(8), "同一扣分只能恢复一次");
assert.equal(startOfWeek(new Date("2026-09-21T09:00:00+08:00")), "2026-09-21");
assert.equal(startOfWeek(new Date("2026-09-27T09:00:00+08:00")), "2026-09-21");
assert.equal(BACKUP_TABLE_NAMES.includes("leaves"), true, "新版备份必须包含树叶流水");
assert.deepEqual(rowsFromBackup({ tables: {} }, "leaves"), [], "旧备份缺少树叶表时应恢复为空");
assert.deepEqual(
  rowsFromBackup({ tables: { leaves: [{ amount: 5 }] } }, "leaves"),
  [{ amount: 5 }],
  "新版备份应保留树叶流水"
);

console.log(`树叶规则与备份兼容测试通过：${cases.length + 21} 项`);
