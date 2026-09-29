import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/weight-range.ts", import.meta.url), "utf8");
const rulesSource = await readFile(new URL("../lib/food-rules.ts", import.meta.url), "utf8");
const compiledRules = ts.transpileModule(rulesSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
}).outputText;
const rulesUrl = `data:text/javascript;base64,${Buffer.from(compiledRules).toString("base64")}`;
const compiled = ts.transpileModule(source.replace('"./food-rules"', `"${rulesUrl}"`), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { filterRecordsByLocalDayRange } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const records = [
  { id: 1, date: "2026-08-30" },
  { id: 2, date: "2026-08-31" },
  { id: 3, date: "2026-09-22" },
  { id: 4, date: "2026-09-23" },
  { id: 5, date: "2026-09-29" },
  { id: 6, date: "2026-09-30" },
];
const localNow = new Date(2026, 8, 29, 23, 30);

assert.deepEqual(
  filterRecordsByLocalDayRange(records, 7, localNow).map((record) => record.id),
  [4, 5],
  "7 天包含今天与此前 6 个本地自然日"
);
assert.deepEqual(
  filterRecordsByLocalDayRange(records, 30, localNow).map((record) => record.id),
  [2, 3, 4, 5],
  "30 天包含今天与此前 29 个本地自然日"
);
assert.equal(
  filterRecordsByLocalDayRange(records, "all", localNow),
  records,
  "全部范围直接使用原记录数组，不复制或修改数据"
);
assert.equal(records.length, 6, "筛选没有删除原始记录");

console.log("体重趋势本地自然日范围测试通过：4 项");
