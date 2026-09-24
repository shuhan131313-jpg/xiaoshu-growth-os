"use client";

import { useEffect } from "react";

export default function BoxPlotError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("箱型图模块发生异常", error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-line bg-card p-6 text-center shadow-card">
      <h1 className="text-lg font-semibold text-ink">箱型图暂时无法完成计算</h1>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        请检查刚才输入的数据后重试。空白项和无法识别的内容会被自动忽略。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        重新尝试
      </button>
    </div>
  );
}
