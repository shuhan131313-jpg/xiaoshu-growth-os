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

const {
  computeCLD,
  computeMeanSd,
  computeStats,
  maximalCliques,
  parseGroupCells,
  parsePastedNumbers,
} = await importTypeScript("../lib/boxplot-analysis.ts");

assert.deepEqual(parsePastedNumbers("1\n2\n3\n"), [1, 2, 3], "换行和末尾换行");
assert.deepEqual(parsePastedNumbers("1\t2\r\n\r\n3"), [1, 2, 3], "Excel 列和空行");
assert.deepEqual(parsePastedNumbers("1, 错误, 2, Infinity, ,3"), [1, 2, 3], "非法值不进入统计");
assert.deepEqual(parseGroupCells(undefined), [], "未初始化组安全视为空组");
assert.deepEqual(parseGroupCells(["", "  ", "4", "bad", "5"]), [4, 5], "编辑中空值安全");

const oneGroup = [computeMeanSd([1, 2, 3]), null];
assert.equal(computeCLD(oneGroup).ok, false, "只有一组时不提前运行 Tukey");

const twoGroups = [computeMeanSd([1, 2, 3, 4, 5]), computeMeanSd([10, 11, 12, 13, 14])];
const twoResult = computeCLD(twoGroups);
assert.equal(twoResult.ok, true, "第二组粘贴后 Tukey 正常完成");
assert.equal(twoResult.labels.every(Boolean), true, "两组都有显著性字母");
assert.notEqual(twoResult.labels[0], twoResult.labels[1], "明显不同的两组得到不同字母");

const threeGroups = [
  computeMeanSd([1, 2, 3]),
  computeMeanSd([4, 5, 6, 7]),
  computeMeanSd([8, 9]),
];
assert.equal(computeCLD(threeGroups).ok, true, "三组且样本数不同时正常");

const sevenGroups = Array.from({ length: 7 }, (_, group) =>
  computeMeanSd(Array.from({ length: group % 3 + 2 }, (_, value) => group * 5 + value))
);
const sevenResult = computeCLD(sevenGroups);
assert.equal(sevenResult.ok, true, "七组数据正常");
assert.equal(sevenResult.labels.length, 7);
assert.equal(sevenResult.labels.every(Boolean), true);

const sameGroups = [computeMeanSd([1, 1, 1]), computeMeanSd([1, 1, 1])];
const sameResult = computeCLD(sameGroups);
assert.equal(sameResult.ok, true, "零组内方差仍可分析");
assert.equal(sameResult.labels[0], sameResult.labels[1], "相同组共享字母");

assert.deepEqual(maximalCliques([[false, false], [false, false]]), [[0], [1]], "无边图不递归自环");
assert.deepEqual(maximalCliques([[false, true], [true, false]]), [[0, 1]], "相连组形成一个团");

const stats = computeStats([1, 2, 3, 4, 100, Number.NaN]);
assert.ok(stats);
assert.equal(stats.values.includes(Number.NaN), false, "NaN 不进入箱型统计");
assert.equal(stats.outliers.includes(100), true, "箱线图离群值逻辑保留");

console.log("箱型图解析、空组、1/2/3/7 组、不同样本量、Tukey 与离群值测试通过");
