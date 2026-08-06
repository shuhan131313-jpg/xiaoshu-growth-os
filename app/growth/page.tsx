"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { todayKey } from "@/lib/utils";
import { getPeriodStat, type PeriodStat } from "@/lib/summary";
import { REVIEW_OPENERS } from "@/lib/ai/content";

type Range = "week" | "month";

function rangeBounds(range: Range): { start: string; end: string; label: string } {
  const end = todayKey();
  if (range === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { start: `${y}-${m}-${day}`, end, label: "近 7 天" };
  }
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return { start: `${y}-${m}-01`, end, label: `${y}年${m}月` };
}

function buildReview(s: PeriodStat): string {
  const opener = REVIEW_OPENERS[Math.floor(Math.random() * REVIEW_OPENERS.length)];
  const focus: string[] = [];
  if (s.exerciseMinutes > 0) focus.push(`运动 ${s.exerciseMinutes} 分钟`);
  if (s.readingCount > 0) focus.push(`阅读 ${s.readingCount} 次`);
  if (s.researchMinutes > 0) focus.push(`论文 ${s.researchMinutes} 分钟`);
  if (s.experimentCount > 0) focus.push(`实验 ${s.experimentCount} 次`);
  if (s.englishCount > 0) focus.push(`英文 ${s.englishCount} 篇`);
  if (s.gratitudeCount > 0) focus.push(`感恩 ${s.gratitudeCount} 篇`);
  const pct = Math.round(s.avgCompletion * 100);
  const advice =
    pct >= 70
      ? "保持得很好，把这种节奏固化成默认状态。"
      : pct >= 40
      ? "已有不错的基础，试着把最低频的习惯（如感恩）提上日程。"
      : "起步阶段不必焦虑，先从每天一件事开始，让「不中断」成为习惯。";
  return `${opener}：${focus.join("、") || "暂无明显积累"}。\n本周期打卡 ${s.checkinDays} 天，平均完成率 ${pct}%。\n💡 ${advice}`;
}

export default function GrowthPage() {
  const [range, setRange] = useState<Range>("week");
  const [stat, setStat] = useState<PeriodStat | null>(null);
  const [review, setReview] = useState("");

  const bounds = useMemo(() => rangeBounds(range), [range]);

  async function load() {
    setStat(await getPeriodStat(bounds.start, bounds.end));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  function genReview() {
    if (stat) setReview(buildReview(stat));
  }

  const rows: { label: string; value: string }[] = stat
    ? [
        { label: "打卡天数", value: `${stat.checkinDays} 天` },
        { label: "平均完成率", value: `${Math.round(stat.avgCompletion * 100)}%` },
        { label: "运动", value: `${stat.exerciseCount} 次 / ${stat.exerciseMinutes} 分` },
        { label: "阅读", value: `${stat.readingCount} 次 / ${stat.readingMinutes} 分` },
        { label: "论文", value: `${stat.researchCount} 次 / ${stat.researchMinutes} 分` },
        { label: "英文", value: `${stat.englishCount} 篇` },
        { label: "实验", value: `${stat.experimentCount} 次` },
        { label: "感恩", value: `${stat.gratitudeCount} 篇` },
        { label: "收藏文献", value: `${stat.literatureCount} 篇` },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader title="成长回顾" desc="让数据替你看见，这段时间的努力" />

      <div className="flex justify-center gap-2">
        {(["week", "month"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`h-10 rounded-2xl px-6 text-sm font-medium transition duration-200 ${
              range === r
                ? "bg-primary text-white shadow-soft"
                : "bg-line/40 text-ink-soft hover:bg-line/70"
            }`}
          >
            {r === "week" ? "周报" : "月报"}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-ink-faint">{bounds.label}</p>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <Card key={r.label}>
            <CardContent>
              <p className="text-xs text-ink-faint">{r.label}</p>
              <p className="tabular mt-1 text-sm font-semibold whitespace-nowrap text-ink">
                {r.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4 text-primary" /> AI 复盘建议
            </span>
            <Button variant="soft" size="sm" onClick={genReview}>
              生成
            </Button>
          </div>
          {review ? (
            <p className="whitespace-pre-line text-[14px] leading-7 text-ink">
              {review}
            </p>
          ) : (
            <p className="text-sm text-ink-faint">
              点「生成」，小树会根据上面的数据给出一段简短复盘。
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-ink-faint">
        <LineChart className="h-4 w-4" /> 数据均来自本机 IndexedDB，离线可用
      </div>
    </div>
  );
}
