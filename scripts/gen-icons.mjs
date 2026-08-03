import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });
const svg = readFileSync("public/icons/icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svg).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");

console.log("✓ PWA 图标已生成 (192 / 512 / 180 / maskable)");
