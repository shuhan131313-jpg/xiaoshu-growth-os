"use client";

import { useMemo, useState, type ClipboardEvent } from "react";
import { RotateCcw, Copy } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

const GROUP_NAMES = [
  "sham",
  "ovx",
  "阳性",
  "未发酵",
  "灭活高",
  "灭活低",
  "未灭活高",
  "未灭活低",
  "菌高",
  "菌低",
] as const;

const SLOTS = 6; // 每组最多 6 个数据

type GroupStats = {
  values: number[];
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
};

/** 线性插值分位数（与 numpy 默认 type-7 一致） */
function quantile(sorted: number[], q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < n) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function computeStats(values: number[]): GroupStats {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lf = q1 - 1.5 * iqr;
  const uf = q3 + 1.5 * iqr;
  const inliers = sorted.filter((v) => v >= lf && v <= uf);
  const whiskerLow = inliers.length ? inliers[0] : q1;
  const whiskerHigh = inliers.length ? inliers[inliers.length - 1] : q3;
  const outliers = sorted.filter((v) => v < lf || v > uf);
  return { values: sorted, q1, q2, q3, iqr, whiskerLow, whiskerHigh, outliers };
}

export default function BoxPlotPage() {
  const [data, setData] = useState<string[][]>(() =>
    GROUP_NAMES.map(() => Array.from({ length: SLOTS }, () => ""))
  );

  const [copiedCol, setCopiedCol] = useState<number | null>(null);

  // 复制某一列已填写的数字（竖向换行），空框跳过；粘贴逻辑保持原样不动
  const copyColumn = async (g: number) => {
    const vals = data[g]
      .map((s) => s.trim())
      .filter((s) => s !== "");
    if (vals.length === 0) return;
    const text = vals.join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedCol(g);
      setTimeout(() => setCopiedCol((c) => (c === g ? null : c)), 1500);
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  };

  const setCell = (g: number, i: number, v: string) => {
    setData((prev) => {
      const next = prev.map((row) => row.slice());
      next[g][i] = v;
      return next;
    });
  };

  const resetAll = () => {
    setData(GROUP_NAMES.map(() => Array.from({ length: SLOTS }, () => "")));
  };

  // 粘贴一整列竖排数字：自动依次填入该列 6 个框（从第一个框开始）
  const handlePaste = (g: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const nums = text
      .split(/[\s,;，；\t\r\n]+/)
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    if (nums.length === 0) return;
    e.preventDefault();
    setData((prev) => {
      const next = prev.map((row) => row.slice());
      nums.slice(0, SLOTS).forEach((v, idx) => {
        next[g][idx] = String(v);
      });
      return next;
    });
  };

  // 解析每组数字（空值不参与）
  const parsed = useMemo(
    () =>
      data.map((row) =>
        row
          .map((s) => s.trim())
          .filter((s) => s !== "")
          .map(Number)
          .filter((v) => !Number.isNaN(v))
      ),
    [data]
  );

  const stats = useMemo(() => parsed.map((v) => (v.length ? computeStats(v) : null)), [parsed]);

  // Y 轴范围（含离群点）
  const domain = useMemo(() => {
    const all = parsed.flat();
    if (all.length === 0) return { min: 0, max: 1 };
    let min = Math.min(...all);
    let max = Math.max(...all);
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }, [parsed]);

  // 图表几何
  const W = 760;
  const H = 400;
  const M = { left: 52, right: 18, top: 18, bottom: 56 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const slot = plotW / GROUP_NAMES.length;
  const boxW = Math.min(slot * 0.5, 38);
  const yOf = (v: number) =>
    M.top + (1 - (v - domain.min) / (domain.max - domain.min)) * plotH;

  const yTicks = Array.from({ length: 5 }, (_, i) => domain.min + ((domain.max - domain.min) * i) / 4);

  const hasAny = parsed.some((v) => v.length > 0);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-6">
      <PageHeader
        title="箱型图快速绘图"
        desc="临时实时可视化工具 · 数据不存储、刷新即清空"
      >
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 清空输入
          </button>
        </div>
      </PageHeader>

      {/* 输入区：10 组，每组占一竖列、强制单行横向排布；桌面完整可见，窄屏横向滚动 */}
      <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto pb-2">
        {GROUP_NAMES.map((name, g) => (
          <div
            key={name}
            className="flex w-24 shrink-0 flex-col rounded-xl border border-line bg-card p-3 shadow-card"
          >
            <p className="mb-2 text-center text-xs font-medium text-primary">{name}</p>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: SLOTS }, (_, i) => (
                <input
                  key={i}
                  type="number"
                  inputMode="decimal"
                  value={data[g][i]}
                  onChange={(e) => setCell(g, i, e.target.value)}
                  onPaste={(e) => handlePaste(g, e)}
                  placeholder={`#${i + 1}`}
                  className="h-8 w-full rounded-md border border-line bg-surface px-2 text-center text-[13px] tabular text-ink outline-none transition duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ink-faint">
              已录入 {parsed[g].length}/{SLOTS}
            </p>
            <button
              type="button"
              onClick={() => copyColumn(g)}
              disabled={parsed[g].length === 0}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
            >
              <Copy className="h-3 w-3" />
              {copiedCol === g ? "已复制 ✓" : "复制本组"}
            </button>
          </div>
        ))}
      </div>

      {/* 图表区 */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">实时箱型图</p>
          <div className="flex items-center gap-4 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-primary/70" /> 四分位区间(IQR)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" /> 离群点
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="箱型图">
            {/* Y 轴网格刻度 */}
            {yTicks.map((t, i) => {
              const y = yOf(t);
              return (
                <g key={`yt${i}`}>
                  <line
                    x1={M.left}
                    y1={y}
                    x2={W - M.right}
                    y2={y}
                    stroke="#E2E5EC"
                    strokeWidth={1}
                  />
                  <text
                    x={M.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill="#9AA1A8"
                  >
                    {Number.isInteger(t) ? t : t.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 坐标轴 */}
            <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + plotH} stroke="#9AA1A8" strokeWidth={1} />
            <line
              x1={M.left}
              y1={M.top + plotH}
              x2={W - M.right}
              y2={M.top + plotH}
              stroke="#9AA1A8"
              strokeWidth={1}
            />

            {/* 每个分组 */}
            {GROUP_NAMES.map((name, g) => {
              const cx = M.left + (g + 0.5) * slot;
              const s = stats[g];
              return (
                <g key={name}>
                  {/* X 轴刻度 */}
                  <line
                    x1={cx}
                    y1={M.top + plotH}
                    x2={cx}
                    y2={M.top + plotH + 4}
                    stroke="#9AA1A8"
                    strokeWidth={1}
                  />
                  {/* 组名 */}
                  <text
                    x={cx}
                    y={M.top + plotH + 20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#666666"
                  >
                    {name}
                  </text>

                  {s && s.values.length > 0 && (
                    <>
                      {s.values.length === 1 ? (
                        <circle cx={cx} cy={yOf(s.q2)} r={3.5} fill="#1A3F90" />
                      ) : (
                        <>
                          {/* 须线 */}
                          <line
                            x1={cx}
                            y1={yOf(s.q3)}
                            x2={cx}
                            y2={yOf(s.whiskerHigh)}
                            stroke="#1A3F90"
                            strokeWidth={1.5}
                          />
                          <line
                            x1={cx}
                            y1={yOf(s.q1)}
                            x2={cx}
                            y2={yOf(s.whiskerLow)}
                            stroke="#1A3F90"
                            strokeWidth={1.5}
                          />
                          {/* 须端短横 */}
                          <line
                            x1={cx - boxW / 3}
                            y1={yOf(s.whiskerHigh)}
                            x2={cx + boxW / 3}
                            y2={yOf(s.whiskerHigh)}
                            stroke="#1A3F90"
                            strokeWidth={1.5}
                          />
                          <line
                            x1={cx - boxW / 3}
                            y1={yOf(s.whiskerLow)}
                            x2={cx + boxW / 3}
                            y2={yOf(s.whiskerLow)}
                            stroke="#1A3F90"
                            strokeWidth={1.5}
                          />
                          {/* 箱体 */}
                          <rect
                            x={cx - boxW / 2}
                            y={yOf(s.q3)}
                            width={boxW}
                            height={Math.max(1, yOf(s.q1) - yOf(s.q3))}
                            fill="#1A3F90"
                            fillOpacity={0.18}
                            stroke="#1A3F90"
                            strokeWidth={1.5}
                          />
                          {/* 中位数 */}
                          <line
                            x1={cx - boxW / 2}
                            y1={yOf(s.q2)}
                            x2={cx + boxW / 2}
                            y2={yOf(s.q2)}
                            stroke="#122C66"
                            strokeWidth={2}
                          />
                        </>
                      )}
                      {/* 离群点 */}
                      {s.outliers.map((o, k) => (
                        <circle key={k} cx={cx} cy={yOf(o)} r={3} fill="#E6C260" stroke="#C9A43F" strokeWidth={0.5} />
                      ))}
                    </>
                  )}
                </g>
              );
            })}

            {!hasAny && (
              <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="#9AA1A8">
                在上方输入数字，图表将实时生成
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
