import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import ts from "typescript";

async function importTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const rules = await importTypeScript("../lib/recent-books-rules.ts");
const backup = await importTypeScript("../lib/backup-format.ts");
const { normalizeRecentBookInput, sortRecentBooks } = rules;
const { BACKUP_TABLE_NAMES, rowsFromBackup } = backup;

const first = normalizeRecentBookInput("  《悉达多》  ", "  黑塞  ", "reading", 10);
const second = normalizeRecentBookInput("《百年孤独》", "", "reading", 20);
const finished = normalizeRecentBookInput("《人类简史》", "已读完", "finished", 30);
assert.equal(first.title, "《悉达多》", "书名保存前去除首尾空格");
assert.equal(first.note, "黑塞", "作者或备注保存前去除首尾空格");
assert.equal(second.note, undefined, "空备注不保存无意义文本");
assert.throws(() => normalizeRecentBookInput("  ", "", "reading"), /请填写书名/, "空书名不能保存");
assert.deepEqual(
  sortRecentBooks([finished, first, second]).map((book) => book.title),
  ["《百年孤独》", "《悉达多》", "《人类简史》"],
  "支持多本在读并将读完记录排在其后"
);
assert.equal(BACKUP_TABLE_NAMES.includes("recentBooks"), true, "备份包含最近在读");
assert.deepEqual(rowsFromBackup({ tables: {} }, "recentBooks"), [], "旧备份缺少书单时按空列表恢复");
assert.deepEqual(rowsFromBackup({ tables: { recentBooks: [first, second] } }, "recentBooks"), [first, second], "新版备份保留多本书");

const dbSource = await readFile(new URL("../lib/db/db.ts", import.meta.url), "utf8");
const readingSource = await readFile(new URL("../app/reading/page.tsx", import.meta.url), "utf8");
const homeSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
assert.match(dbSource, /version\(12\)[\s\S]*recentBooks:\s*"\+\+id, status, updatedAt"/, "书单通过增量版本新增表");
assert.match(readingSource, /最近在读/, "阅读页展示最近在读");
assert.match(readingSource, /toggleBookStatus/, "每本书可独立切换状态");
assert.match(readingSource, /saveBookEdit/, "书名可修改");
assert.match(readingSource, /deleteBook/, "书籍记录可删除");
assert.doesNotMatch(readingSource, /bookNote|editNote|作者或备注/, "新增和编辑界面只保留书名输入");
assert.doesNotMatch(readingSource, /每日书摘|换一本|BOOK_POOL/, "每日书摘与换一本逻辑已移除");
assert.match(homeSource, /PROGRESS_KEYS = \["exercise", "reading", "research", "gratitude"\]/, "首页进度按实际项目自动排列");
assert.doesNotMatch(homeSource, /PROGRESS_SLOTS|null, "research"|"research", null/, "首页不再保留虚假空槽位");

for (const removedRoute of ["../app/english/page.tsx", "../app/leaves/page.tsx"]) {
  await assert.rejects(access(new URL(removedRoute, import.meta.url)), "已移除的页面路由不应残留");
}

console.log("最近在读、状态视觉、首页自动排列、移除页面与备份兼容测试通过：19 项");
