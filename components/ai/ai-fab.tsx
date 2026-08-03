"use client";

import { useState } from "react";
import { Leaf, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/common/sheet";
import { Button } from "@/components/ui/button";
import { repos } from "@/lib/db/repo";
import { TODAY_MODULES } from "@/lib/constants";
import { todayKey } from "@/lib/utils";
import { getTodayTaskMap, getHeatmap, computeStreak, datesByTable } from "@/lib/summary";
import { ENCOURAGE_POOL, pickDistinct } from "@/lib/ai/content";

type Action = "encourage" | "analyze" | "plan" | "summary";

export function AIFab() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [active, setActive] = useState<Action | null>(null);

  async function run(action: Action) {
    setActive(action);
    setBusy(true);
    setOutput("");
    try {
      setOutput(await generate(action));
    } finally {
      setBusy(false);
    }
  }

  async function generate(action: Action): Promise<string> {
    if (action === "encourage") {
      return pickDistinct(ENCOURAGE_POOL);
    }
    if (action === "analyze") {
      const [ex, rd, md, rs, gr, exp, en] = await Promise.all([
        datesByTable(repos.exercise),
        datesByTable(repos.reading),
        datesByTable(repos.meditation),
        datesByTable(repos.research),
        datesByTable(repos.gratitude),
        datesByTable(repos.experiment),
        datesByTable(repos.english),
      ]);
      const [sEx, sMd, sGr] = await Promise.all([
        computeStreak(ex),
        computeStreak(md),
        computeStreak(gr),
      ]);
      const heat = await getHeatmap(7);
      const avg = (
        (heat.reduce((a, b) => a + b.count, 0) / (heat.length * TODAY_MODULES.length)) *
        100
      ).toFixed(0);
      const parts = [
        `近 7 天平均每日完成率约 ${avg}%。`,
        sEx > 0 ? `运动已连续 ${sEx} 天。` : "运动还没形成连续习惯，先从每周 2 次开始吧。",
        sMd > 0 ? `冥想已连续 ${sMd} 天，很稳。` : "冥想可以尝试每天 5 分钟，门槛越低越好坚持。",
        sGr > 0 ? `感恩日记连续 ${sGr} 天，你正在训练看见光。` : "今天写 3 件感恩小事，心情会更好。",
        `阅读累计 ${rd.length} 次、论文 ${rs.length} 次、实验 ${exp.length} 次、英文 ${en.length} 篇。`,
      ];
      return "📊 习惯分析\n" + parts.join("\n");
    }
    if (action === "plan") {
      const map = await getTodayTaskMap(todayKey());
      const undone = TODAY_MODULES.filter((m) => !map[m.key]).map((m) => m.label);
      if (undone.length === 0)
        return "✅ 今天的计划都完成啦，了不起！可以复习一篇英文短文，或写写今天的感恩日记，给这一天收个温柔的尾。";
      return (
        "🗓️ 今日学习计划\n还有这些没做：" +
        undone.join("、") +
        "。\n建议从最小的一件开始：运动 5 分钟，或读两页书，先让身体动起来，后面的事会顺很多。"
      );
    }
    // summary
    const gr = (await repos.gratitude.all()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    const rd = (await repos.reading.all()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    const lines: string[] = [];
    if (gr.length) {
      const items = gr.flatMap((g) => g.items).slice(0, 5);
      lines.push("最近你感恩的事：" + (items.join("，") || "（暂无）") + "。");
    }
    if (rd.length) {
      const feels = rd.map((r) => r.feeling).filter(Boolean).slice(0, 3);
      if (feels.length) lines.push("阅读感悟：" + feels.join("；") + "。");
    }
    if (!lines.length) return "还没有足够的笔记可以总结，先去记录今天的运动或阅读吧 🌱";
    return "📝 笔记小结\n" + lines.join("\n");
  }

  const actions: { key: Action; label: string }[] = [
    { key: "encourage", label: "鼓励文案" },
    { key: "analyze", label: "习惯分析" },
    { key: "plan", label: "学习计划" },
    { key: "summary", label: "总结笔记" },
  ];

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
        onClick={() => setOpen(true)}
        aria-label="小树AI助手"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-soft md:bottom-6 md:right-6"
      >
        <Leaf className="h-6 w-6" />
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} title="小树 AI 助手">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.key}
                onClick={() => run(a.key)}
                disabled={busy}
                className={`rounded-2xl px-3 py-2 text-[13px] font-medium transition duration-200 ${
                  active === a.key
                    ? "bg-primary text-white shadow-soft"
                    : "bg-line/40 text-ink-soft hover:bg-line/70"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="min-h-[140px] rounded-2xl bg-line/30 p-4">
            {busy ? (
              <p className="flex items-center gap-2 text-sm text-ink-faint">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" /> 小树正在思考…
              </p>
            ) : output ? (
              <p className="whitespace-pre-line text-[14px] leading-7 text-ink">
                {output}
              </p>
            ) : (
              <p className="text-sm text-ink-faint">
                点上面的按钮，让小树帮你鼓励、分析习惯、制定计划或总结笔记。
                <br />
                （首期为本地智能，无需联网；设置里填 Key 后可接真实模型。）
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" /> 关闭
          </Button>
        </div>
      </Sheet>
    </>
  );
}
