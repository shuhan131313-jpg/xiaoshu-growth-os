"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Flame, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timer } from "@/components/common/timer";
import { FoldList } from "@/components/common/fold-list";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { MeditationRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";
import { computeStreak, datesByTable } from "@/lib/summary";

const PRESETS = [5, 10, 15, 20, 30];

export default function MeditationPage() {
  const today = todayKey();
  const [minutes, setMinutes] = useState(10);
  const [custom, setCustom] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayRecords, setTodayRecords] = useState<MeditationRecord[]>([]);
  const [recent, setRecent] = useState<MeditationRecord[]>([]);
  const [savedTip, setSavedTip] = useState(false);

  const curMonth = useMemo(() => today.slice(0, 7), [today]);
  const monthRecent = useMemo(
    () => recent.filter((r) => r.date.startsWith(curMonth)),
    [recent, curMonth]
  );

  async function refresh() {
    setStreak(await computeStreak(await datesByTable(repos.meditation)));
    const tr = await repos.meditation.whereDate(today);
    setTodayRecords(tr);
    const all = await repos.meditation.all();
    setRecent(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(m: number) {
    setMinutes(m);
    setCustom("");
    setTimerKey((k) => k + 1);
  }
  function onCustom(v: string) {
    setCustom(v);
    const n = Number(v);
    if (n > 0) {
      setMinutes(n);
      setTimerKey((k) => k + 1);
    }
  }

  async function save(elapsedSec: number) {
    const dur = Math.max(1, Math.round(elapsedSec / 60));
    await repos.meditation.add({
      date: today,
      duration: dur,
      createdAt: Date.now(),
    });
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 2000);
    refresh();
  }

  const todayMin = todayRecords.reduce((s, r) => s + (r.duration || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="冥想" desc="找个安静的角落，和自己待一会儿" />

      <Card>
        <CardContent className="flex flex-col items-center gap-5 pt-2">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Flame className="h-4 w-4 text-accent" />
            连续打卡 <span className="tabular font-semibold text-ink">{streak}</span> 天
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => pick(m)}
                className={`h-11 rounded-2xl px-4 text-sm font-medium transition duration-200 active:scale-95 ${
                  minutes === m && !custom
                    ? "bg-primary text-white shadow-soft"
                    : "bg-line/40 text-ink-soft hover:bg-line/70"
                }`}
              >
                {m} 分钟
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-2xl bg-line/40 px-2">
              <Input
                type="number"
                inputMode="numeric"
                value={custom}
                onChange={(e) => onCustom(e.target.value)}
                placeholder="自定义"
                className="h-9 w-20 border-0 bg-transparent px-1 focus:ring-0"
              />
              <span className="text-xs text-ink-faint">分</span>
            </div>
          </div>

          <Timer
            key={timerKey}
            mode="countdown"
            targetSeconds={minutes * 60}
            goalLabel={`目标 ${minutes} 分钟`}
            onComplete={save}
            onStop={save}
          />

          {savedTip && (
            <p className="flex items-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> 已记录本次冥想
            </p>
          )}
        </CardContent>
      </Card>

      {todayRecords.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-2 text-sm font-medium text-ink-soft">今日已冥想</p>
            <p className="tabular text-2xl font-semibold text-ink">
              {todayMin} <span className="text-sm font-normal text-ink-faint">分钟</span>
            </p>
          </CardContent>
        </Card>
      )}

      {monthRecent.length > 0 && (
        <Card>
          <CardContent>
            <FoldList
              items={monthRecent}
              title={
                <p className="mb-3 text-sm font-medium text-ink-soft">
                  最近记录（{monthRecent.length}）
                </p>
              }
              renderItem={(r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink-soft">{r.date}</span>
                  <span className="tabular text-ink">{r.duration} 分钟</span>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-ink-faint">
        <Brain className="h-4 w-4" /> 冥想记录自动保存在本机，断网也能用
      </div>
    </div>
  );
}
