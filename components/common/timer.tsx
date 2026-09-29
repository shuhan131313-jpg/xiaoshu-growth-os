"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TimerHandle {
  finish: () => number | null;
  reset: () => void;
}

interface TimerProps {
  size?: number;
  className?: string;
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
}

function fmt(sec: number): string {
  const value = Math.max(0, Math.floor(sec));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/** 论文专注使用的开放式计时器：中央开始，外部按钮结束并记录。 */
export const Timer = forwardRef<TimerHandle, TimerProps>(function Timer(
  { size = 128, className, disabled = false, onActiveChange },
  ref
) {
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || startedAtRef.current == null) return;
    const update = () => {
      if (startedAtRef.current == null) return;
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [active]);

  function start() {
    if (active || disabled) return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setActive(true);
    onActiveChange?.(true);
  }

  useImperativeHandle(ref, () => ({
    finish() {
      if (!active || startedAtRef.current == null) return null;
      const seconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      setElapsed(seconds);
      setActive(false);
      onActiveChange?.(false);
      return seconds;
    },
    reset() {
      startedAtRef.current = null;
      setElapsed(0);
      setActive(false);
      onActiveChange?.(false);
    },
  }), [active, onActiveChange]);

  const stroke = 6;
  const radius = (size - stroke) / 2;

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="#FFFFFF"
            stroke="#D9DEDF"
            strokeWidth={stroke}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {active ? (
            <span className="tabular text-xl font-semibold tracking-tight text-ink">
              {fmt(elapsed)}
            </span>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={disabled}
              className="flex h-full w-full items-center justify-center rounded-full text-base font-semibold text-primary transition hover:bg-primary/[0.03]"
              aria-label="开始论文专注"
            >
              开始
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
