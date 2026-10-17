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

const { shouldSubmitOnEnter } = await importTypeScript("../lib/input-submit.ts");
const { keyboardViewportMetrics } = await importTypeScript("../lib/viewport-rules.ts");

assert.equal(shouldSubmitOnEnter({ key: "Enter" }), true, "普通回车允许提交");
assert.equal(
  shouldSubmitOnEnter({ key: "Enter", isComposing: true }),
  false,
  "中文输入法组合阶段不提交"
);
assert.equal(
  shouldSubmitOnEnter({ key: "Enter", keyCode: 229 }),
  false,
  "Android 输入法候选词确认不提交"
);
assert.equal(shouldSubmitOnEnter({ key: "Enter", shiftKey: true }), false, "Shift+Enter 不提交");
assert.equal(shouldSubmitOnEnter({ key: "Tab" }), false, "其他按键不提交");
assert.equal(
  shouldSubmitOnEnter({ key: "Enter", defaultPrevented: true }),
  false,
  "页面已有特殊回车行为时不重复提交"
);

assert.deepEqual(
  keyboardViewportMetrics(800, 800, 0, 800),
  { height: 800, offsetTop: 0, keyboardInset: 0, keyboardOpen: false },
  "键盘收起时保持完整可视区域"
);
assert.deepEqual(
  keyboardViewportMetrics(800, 470, 0, 800),
  { height: 470, offsetTop: 0, keyboardInset: 330, keyboardOpen: true },
  "Android 键盘压缩 visualViewport 时识别键盘高度"
);
assert.deepEqual(
  keyboardViewportMetrics(800, 700, 0, 800),
  { height: 700, offsetTop: 0, keyboardInset: 100, keyboardOpen: true },
  "超过阈值的可视区域变化视为键盘打开"
);

const files = Object.fromEntries(
  await Promise.all(
    [
      "../components/layout/keyboard-viewport.tsx",
      "../components/common/sheet.tsx",
      "../components/ui/input.tsx",
      "../components/ui/textarea.tsx",
      "../app/globals.css",
      "../components/food/food-record-sheet.tsx",
      "../app/account/page.tsx",
      "../app/reading/page.tsx",
      "../components/mainline/mainline-sheet.tsx",
      "../components/milestones/milestone-sheet.tsx",
      "../app/research/page.tsx",
      "../app/exercise/page.tsx",
    ].map(async (path) => [path, await readFile(new URL(path, import.meta.url), "utf8")])
  )
);

assert.match(files["../components/layout/keyboard-viewport.tsx"], /visualViewport/, "统一监听 visualViewport");
assert.match(files["../components/layout/keyboard-viewport.tsx"], /scrollIntoView/, "输入控件被遮挡时滚入可视区");
assert.match(files["../components/common/sheet.tsx"], /--visual-viewport-height/, "底部弹层跟随可视视口高度");
assert.match(files["../app/globals.css"], /data-keyboard-open[\s\S]*keyboard-dismissible/, "键盘打开时移开底栏与悬浮按钮");
assert.match(files["../components/ui/input.tsx"], /nativeEvent\.isComposing/, "单行输入组件检查输入法组合状态");
assert.doesNotMatch(files["../components/ui/textarea.tsx"], /onEnterSubmit/, "多行文本框保留回车换行");

for (const path of [
  "../components/food/food-record-sheet.tsx",
  "../app/account/page.tsx",
  "../app/reading/page.tsx",
  "../components/mainline/mainline-sheet.tsx",
  "../components/milestones/milestone-sheet.tsx",
  "../app/research/page.tsx",
  "../app/exercise/page.tsx",
]) {
  assert.match(files[path], /onEnterSubmit=/, `${path} 已接入回车提交`);
}

console.log("手机键盘避让、中文输入法保护、回车提交与多行换行测试通过：21 项");
