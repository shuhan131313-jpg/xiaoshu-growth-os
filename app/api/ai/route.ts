import { NextRequest, NextResponse } from "next/server";

/**
 * 二期实现：代理真实大模型（读取用户在设置中填写的 API Key）。
 * 首期 AI 由前端本地内容池 + 规则生成（见 lib/ai/aiService.ts），
 * 本路由仅预留结构，避免删除/重建导致的链路断裂。
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "AI proxy not implemented yet (phase 2)" },
    { status: 501 }
  );
}
