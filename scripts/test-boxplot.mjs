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
  parseBatchValues,
  flattenBatchValues,
} = await importTypeScript("../lib/boxplot-analysis.ts");
const { BOXPLOT_GROUP_PALETTE, BOXPLOT_TREATMENT_LEGEND } = await importTypeScript(
  "../lib/boxplot-palette.ts"
);
const pageSource = await readFile(new URL("../app/boxplot/page.tsx", import.meta.url), "utf8");

assert.equal(BOXPLOT_GROUP_PALETTE.length, 10, "10 个固定组均有颜色");
assert.equal(BOXPLOT_TREATMENT_LEGEND.length, 7, "颜色按 7 个处理体系组织");
assert.deepEqual(BOXPLOT_GROUP_PALETTE[4], BOXPLOT_GROUP_PALETTE[5], "灭活高低剂量同色");
assert.deepEqual(BOXPLOT_GROUP_PALETTE[6], BOXPLOT_GROUP_PALETTE[7], "未灭活高低剂量同色");
assert.deepEqual(BOXPLOT_GROUP_PALETTE[8], BOXPLOT_GROUP_PALETTE[9], "单菌液高低剂量同色");
assert.notEqual(BOXPLOT_GROUP_PALETTE[0].stroke, BOXPLOT_GROUP_PALETTE[1].stroke, "不同处理体系颜色可区分");
assert.match(pageSource, /DISPLAY_LABELS = \["Sham", "OVX", "E2", "UO", "IFO-H", "IFO-L", "VFO-H", "VFO-L", "WM48-H", "WM48-L"\]/, "横轴使用固定英文简称映射");
assert.match(pageSource, /DISPLAY_SETTINGS_KEY/, "图表标题和单位有独立持久化键");
assert.doesNotMatch(pageSource, /同一处理的高 \/ 低剂量使用同色|浅色柱为均值，同色线为标准差/, "移除图表右上角说明文字");
assert.match(pageSource, /箱型图单位/, "箱型图提供独立单位输入");
assert.match(pageSource, /柱形图单位/, "柱形图提供独立单位输入");
assert.match(pageSource, /labelFor\(g\)/, "两种图表都使用显示名称而非底层组名");
assert.match(pageSource, /LEGEND_LABELS = \[/, "底部图例使用固定中文名称");
for (const label of [
  "假手术组",
  "OVX 模型组",
  "阳性对照组",
  "未发酵燕麦组",
  "灭活高剂量组",
  "灭活低剂量组",
  "未灭活高剂量组",
  "未灭活低剂量组",
  "菌液高剂量组",
  "菌液低剂量组",
]) {
  assert.match(pageSource, new RegExp(label), `图例包含${label}`);
}
assert.match(pageSource, /BOXPLOT_GROUP_PALETTE\[index\]/, "图例复用现有颜色映射");
assert.match(pageSource, /aria-label=\"分组图例\"/, "图例为独立区域");
assert.match(pageSource, /grid grid-cols-1 gap-y-2\.5/, "图例单列竖向排列");
assert.match(pageSource, /whitespace-nowrap text-sm/, "图例名称不换行");

assert.deepEqual(parsePastedNumbers("1\n2\n3\n"), [1, 2, 3], "换行和末尾换行");
assert.deepEqual(parsePastedNumbers("1\t2\r\n\r\n3"), [1, 2, 3], "Excel 列和空行");
assert.deepEqual(parsePastedNumbers("1, 错误, 2, Infinity, ,3"), [1, 2, 3], "非法值不进入统计");
assert.deepEqual(parseGroupCells(undefined), [], "未初始化组安全视为空组");
assert.deepEqual(parseGroupCells(["", "  ", "4", "bad", "5"]), [4, 5], "编辑中空值安全");
assert.deepEqual(parseBatchValues("1\n0\n-2\n3"), { values: [1, 0, -2, 3], errors: [] }, "批量解析保留 0 和负数");
assert.equal(parseBatchValues("1\n\n2").errors.length, 1, "批量解析指出内部空位置");
const batch = Array.from({ length: 70 }, (_, index) => String(index % 7 === 0 ? 0 : index + 1)).join("\n");
assert.equal(parseBatchValues(batch).values.length, 70, "70 个位置完整解析");
assert.equal(flattenBatchValues([['1', '', '0'], ['-2']], 3).split("\n").length, 6, "批量复制固定输出每个位置");

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
assert.deepEqual(computeStats([0, 0, 2, 4])?.values, [2, 4], "绘图统计排除 0 占位值");

console.log("箱型图解析、空组、1/2/3/7 组、不同样本量、Tukey 与离群值测试通过");
