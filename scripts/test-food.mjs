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

const rules = await importTypeScript("../lib/food-rules.ts");
const backup = await importTypeScript("../lib/backup-format.ts");
const {
  createFoodRecordData,
  editFoodRecordData,
  foodDaySummary,
  formatFoodTime,
  groupFoodRecordsByDay,
  localDateKey,
  sortFoodRecords,
} = rules;
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

const lateNight = new Date(2026, 8, 25, 23, 58).getTime();
const nextMorning = new Date(2026, 8, 26, 0, 6).getTime();
assert.equal(localDateKey(lateNight), "2026-09-25", "深夜记录归属本地当天");
assert.equal(localDateKey(nextMorning), "2026-09-26", "跨过本地零点后归属新一天");
assert.equal(formatFoodTime(lateNight), "23:58", "时间由创建时刻自动生成");

const breakfast = { id: 1, ...createFoodRecordData("鸡蛋 + 牛奶", false, new Date(2026, 8, 25, 8, 16).getTime()) };
const snack = { id: 2, ...createFoodRecordData("饼干", true, new Date(2026, 8, 25, 15, 6).getTime()) };
const milk = { id: 3, ...createFoodRecordData("牛奶", false, new Date(2026, 8, 25, 16, 21).getTime()) };
const nextDay = { id: 4, ...createFoodRecordData("豆浆", false, nextMorning) };

assert.equal(breakfast.isUnplanned, false, "普通饮食使用同一记录结构");
assert.equal(snack.isUnplanned, true, "计划外仅由布尔标签区分");
assert.equal(new Set([breakfast.id, snack.id, milk.id]).size, 3, "同日多次饮食保持独立记录");

const sorted = sortFoodRecords([milk, breakfast, snack]);
assert.deepEqual(sorted.map((record) => record.id), [1, 2, 3], "当天记录按创建时间升序显示");

const edited = editFoodRecordData(snack, "燕麦饼干", snack.updatedAt + 10_000);
assert.equal(edited.content, "燕麦饼干");
assert.equal(edited.createdAt, snack.createdAt, "编辑不改变原始时间");
assert.equal(edited.date, snack.date, "编辑不改变原始日期归属");
assert.equal(edited.isUnplanned, true, "编辑不改变计划外标签");

const groups = groupFoodRecordsByDay([snack, nextDay, milk, breakfast]);
assert.deepEqual(groups.map((group) => group.date), ["2026-09-26", "2026-09-25"], "历史日期从新到旧");
assert.deepEqual(groups[1].records.map((record) => record.id), [1, 2, 3], "每天内部保持时间顺序");
assert.deepEqual(foodDaySummary(groups[1].records), { total: 3, unplanned: 1 }, "每日计数正确");

assert.equal(Object.hasOwn(snack, "amount"), false, "饮食记录不包含树叶变动");
assert.equal(BACKUP_TABLE_NAMES.includes("foodRecords"), true, "新版备份包含饮食记录");
assert.deepEqual(rowsFromBackup({ tables: {} }, "foodRecords"), [], "旧备份缺少饮食表时恢复为空");
assert.deepEqual(
  rowsFromBackup({ tables: { foodRecords: [snack] } }, "foodRecords"),
  [snack],
  "新版备份保留逐条饮食记录"
);

const dbSource = await readFile(new URL("../lib/db/db.ts", import.meta.url), "utf8");
const foodSource = await readFile(new URL("../lib/food.ts", import.meta.url), "utf8");
assert.match(dbSource, /version\(11\)[\s\S]*foodRecords:\s*"\+\+id, date, createdAt"/, "数据库通过新版本新增表");
assert.match(foodSource, /db\.foodRecords\.delete\(id\)/, "删除只作用于指定饮食记录");
assert.doesNotMatch(foodSource, /leaves|树叶|deduct/i, "饮食数据层不调用树叶系统");

console.log("饮食记录日期、排序、编辑、分组、计数、备份与积分隔离测试通过：21 项");
