import { repos } from "@/lib/db/repo";

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIResult {
  text: string;
  source: "local" | "remote";
}

/**
 * 读取用户是否在设置中填写了真实模型的 API Key。
 * 首期本地内容池模式返回 false；二期在设置模块写入 key 后此处返回 true。
 */
async function hasApiKey(): Promise<boolean> {
  try {
    const row = await repos.settings
      .all()
      .then((rows) => rows.find((r) => r.key === "aiProvider"));
    return Boolean(row && row.value && (row.value as Record<string, unknown>).apiKey);
  } catch {
    return false;
  }
}

/** 本地内容池：鼓励文案（样例，后续持续扩充） */
const ENCOURAGE_POOL = [
  "今天也辛苦啦，慢慢来，比较快。",
  "小树苗每天长一点点，你也是。",
  "完成比完美更重要，先动起来。",
  "给自己一点耐心，成长需要时间。",
  "你已经比昨天多走了一步，这就很棒。",
];

export function localEncourage(): string {
  return ENCOURAGE_POOL[Math.floor(Math.random() * ENCOURAGE_POOL.length)];
}

/**
 * AI 统一入口：有 Key 走 /api/ai（二期），否则本地兜底。
 * 首期返回本地鼓励文案，保证离线可运行、零配置。
 */
export async function aiComplete(_prompt: string, _opts?: AIOptions): Promise<AIResult> {
  const remote = await hasApiKey();
  if (remote) {
    // 二期：const r = await fetch("/api/ai", {...}); return ...;
  }
  return { text: localEncourage(), source: "local" };
}
