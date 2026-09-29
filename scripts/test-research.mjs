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

const research = await importTypeScript("../lib/research-rules.ts");
const leaves = await importTypeScript("../lib/leaves-rules.ts");
const backup = await importTypeScript("../lib/backup-format.ts");
const { timerDurationMinutes, validManualMinutes } = research;
const { researchLeavesForSeconds, researchRewardKey } = leaves;
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

assert.equal(timerDurationMinutes(47 * 60 + 59), 47, "计时记录使用完整实际分钟，不进位");
assert.equal(validManualMinutes("35"), 35, "35 分钟补录有效");
assert.equal(validManualMinutes("80"), 80, "80 分钟补录有效");
assert.equal(validManualMinutes("9"), 9, "不足 10 分钟仍可补录");
for (const invalid of ["", "0", "-3", "abc", Number.NaN]) {
  assert.equal(validManualMinutes(invalid), null, `非法时长 ${String(invalid)} 不创建记录`);
}
assert.equal(researchLeavesForSeconds(47 * 60), 20, "47 分钟正常计时 +20");
assert.equal(researchLeavesForSeconds(35 * 60), 15, "35 分钟补录 +15");
assert.equal(researchLeavesForSeconds(80 * 60), 40, "80 分钟补录 +40");
assert.equal(researchLeavesForSeconds(9 * 60), 0, "9 分钟补录 +0");
assert.equal(researchRewardKey(12), researchRewardKey(12), "同一论文记录使用稳定奖励键");
assert.notEqual(researchRewardKey(12), researchRewardKey(13), "不同论文记录独立结算");
assert.equal(BACKUP_TABLE_NAMES.includes("research"), true, "正常计时与补录共用备份中的 research 表");
assert.deepEqual(rowsFromBackup({ tables: { research: [{ duration: 20 }] } }, "research"), [{ duration: 20 }], "旧记录缺少 source 字段仍可恢复");

const pageSource = await readFile(new URL("../app/research/page.tsx", import.meta.url), "utf8");
const timerSource = await readFile(new URL("../components/common/timer.tsx", import.meta.url), "utf8");
assert.doesNotMatch(pageSource, /专注目标（分钟）|目标 60 分钟/, "页面已删除专注目标");
assert.doesNotMatch(timerSource, /RotateCcw|aria-label="重置"/, "计时器已删除刷新重置按钮");
assert.match(pageSource, /onClick=\{saveSummaryOnly\}/, "仅保存小结使用独立保存操作");
assert.match(pageSource, /onClick=\{finishTimer\}/, "结束并记录使用独立结算操作");
assert.match(pageSource, /source: "timer" \| "manual"/, "计时和补录共用论文记录体系并标记来源");

console.log("论文计时、补录奖励、输入校验、幂等键与备份兼容测试通过：22 项");
