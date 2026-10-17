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
const backup = await importTypeScript("../lib/backup-format.ts");
const { timerDurationMinutes, validManualMinutes } = research;
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

assert.equal(timerDurationMinutes(47 * 60 + 59), 47, "计时记录使用完整实际分钟，不进位");
assert.equal(validManualMinutes("35"), 35, "35 分钟补录有效");
assert.equal(validManualMinutes("80"), 80, "80 分钟补录有效");
assert.equal(validManualMinutes("9"), 9, "不足 10 分钟仍可补录");
for (const invalid of ["", "0", "-3", "abc", Number.NaN]) {
  assert.equal(validManualMinutes(invalid), null, `非法时长 ${String(invalid)} 不创建记录`);
}
assert.equal(BACKUP_TABLE_NAMES.includes("research"), true, "正常计时与补录共用备份中的 research 表");
assert.deepEqual(rowsFromBackup({ tables: { research: [{ duration: 20 }] } }, "research"), [{ duration: 20 }], "旧记录缺少 source 字段仍可恢复");

const pageSource = await readFile(new URL("../app/research/page.tsx", import.meta.url), "utf8");
const timerSource = await readFile(new URL("../components/common/timer.tsx", import.meta.url), "utf8");
assert.doesNotMatch(pageSource, /专注目标（分钟）|目标 60 分钟/, "页面已删除专注目标");
assert.doesNotMatch(timerSource, /RotateCcw|aria-label="重置"/, "计时器已删除刷新重置按钮");
assert.doesNotMatch(pageSource, /saveSummaryOnly|仅保存小结/, "仅保存小结操作已移除");
assert.match(pageSource, /onClick=\{finishTimer\}/, "结束并记录使用独立结算操作");
assert.match(pageSource, /draftReady|saveResearchDraft\(summary\)/, "专注内容改为自动保存草稿");
assert.match(pageSource, /source: "timer" \| "manual"/, "计时和补录共用专注记录体系并标记来源");
assert.match(pageSource, /repos\.research\.add\(/, "计时和补录直接保存专注记录");
assert.doesNotMatch(pageSource, /Leaves|leaves|树叶|🌿/, "专注页面不再结算或展示树叶");
assert.match(pageSource, /title="专注"/, "用户可见模块名称已改为专注");
assert.doesNotMatch(pageSource, /今日科研文献推荐|收藏此文献/, "科研文献推荐与收藏入口已移除");

console.log("专注计时、补录、自动保存、输入校验与备份兼容测试通过：19 项");
