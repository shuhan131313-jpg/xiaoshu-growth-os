"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimerProps {
  mode?: "countup" | "countdown";
  /** 倒计时目标秒数（mode=countdown 时必填） */
  targetSeconds?: number;
  goalLabel?: string;
  onComplete?: (elapsed: number) => void;
  onStop?: (elapsed: number) => void;
  size?: number;
  className?: string;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function Timer({
  mode = "countup",
  targetSeconds = 0,
  goalLabel,
  onComplete,
  onStop,
  size = 220,
  className,
}: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const anchorRef = useRef<number>(0); // 暂停时累计的起点
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCountdown = mode === "countdown";
  const total = isCountdown ? Math.max(1, targetSeconds) : elapsed;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const display = isCountdown ? remaining : elapsed;
  const ratio = isCountdown
    ? Math.min(1, elapsed / Math.max(1, targetSeconds))
    : 0;

  useEffect(() => {
    if (!running) return;
    anchorRef.current = Date.now() - elapsed * 1000;
    rafRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - anchorRef.current) / 1000);
      setElapsed(e);
      if (isCountdown && e >= targetSeconds) {
        setRunning(false);
        setElapsed(targetSeconds);
        setDone(true);
        onComplete?.(targetSeconds);
      }
    }, 250);
    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function toggle() {
    if (done) return;
    setRunning((r) => !r);
  }
  function reset() {
    setRunning(false);
    setElapsed(0);
    setDone(false);
    anchorRef.current = 0;
  }
  function stop() {
    if (done) return; // 已完成时 onComplete 已保存，避免重复写入
    if (running) setRunning(false);
    onStop?.(elapsed);
  }

  // SVG 圆环
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#ECE6DD"
            strokeWidth={stroke}
          />
          {isCountdown && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#6FAE7E"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-300"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-5xl font-semibold text-ink">
            {fmt(display)}
          </span>
          {goalLabel && (
            <span className="mt-1 text-xs text-ink-faint">{goalLabel}</span>
          )}
          {done && (
            <span className="mt-1 text-sm font-medium text-accent-dark">
              ✓ 完成
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={running ? "outline" : "accent"}
          size="lg"
          onClick={toggle}
          disabled={done}
          className="w-32"
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" /> 暂停
            </>
          ) : done ? (
            "已完成"
          ) : (
            <>
              <Play className="h-4 w-4" /> 开始
            </>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={reset} aria-label="重置">
          <RotateCcw className="h-5 w-5" />
        </Button>
        {onStop && (
          <Button variant="ghost" size="sm" onClick={stop}>
            结束并记录
          </Button>
        )}
      </div>
    </div>
  );
}
