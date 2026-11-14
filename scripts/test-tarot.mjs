import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const temp = path.join(root, ".tmp-tarot-verify");
fs.rmSync(temp, { recursive: true, force: true });

try {
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  execFileSync(process.execPath, [tsc, "lib/tarot-data.ts", "--target", "es2020", "--module", "es2020", "--skipLibCheck", "--outDir", temp], { cwd: root, stdio: "pipe" });
  const { TAROT_CARDS } = await import(pathToFileURL(path.join(temp, "tarot-data.js")).href);
  if (TAROT_CARDS.length !== 78) throw new Error(`牌数不是78：${TAROT_CARDS.length}`);
  if (new Set(TAROT_CARDS.map((card) => card.id)).size !== 78) throw new Error("存在重复牌ID");
  const missing = TAROT_CARDS.filter((card) => !card.image || !fs.existsSync(path.join(root, "public", card.image.slice(1))));
  if (missing.length) throw new Error(`缺少牌面图片：${missing.map((card) => card.id).join(", ")}`);
  const incomplete = TAROT_CARDS.filter((card) => !card.lesson || card.lesson.symbols.length < 3 || !card.lesson.upright.core || !card.lesson.reversed.explanation || card.lesson.exercises.length < 2 || card.lesson.recallPrompts.length < 4);
  if (incomplete.length) throw new Error(`课程不完整：${incomplete.map((card) => card.id).join(", ")}`);
  if (!TAROT_CARDS[0].lesson || TAROT_CARDS[0].chineseName !== "愚人") throw new Error("愚人课程缺失");
  console.log("塔罗课程校验通过：78 张牌、78 个本地图片、78 个完整课程、无重复ID");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

