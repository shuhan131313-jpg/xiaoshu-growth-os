"use client";

import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import { RotateCcw, Copy, ClipboardPaste, Check } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { BoxplotAnalysisBoundary } from "@/components/boxplot/boxplot-analysis-boundary";
import {
  BOXPLOT_GROUP_PALETTE,
  BOXPLOT_TREATMENT_LEGEND,
} from "@/lib/boxplot-palette";
import {
  computeCLD,
  computeMeanSd,
  computeStats,
  parseGroupCells,
  parseBatchValues,
  flattenBatchValues,
  parsePastedNumbers,
  type MeanSd,
} from "@/lib/boxplot-analysis";

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

const SLOTS = 7; // 每组最多 7 个数据
const DISPLAY_SETTINGS_KEY = "boxplot.display-settings.v1";
const DISPLAY_LABELS = ["Sham", "OVX", "E2", "UO", "IFO-H", "IFO-L", "VFO-H", "VFO-L", "WM48-H", "WM48-L"] as const;
const LEGEND_LABELS = [
  "假手术组",
  "OVX 模型组",
  "阳性对照组",
  "未发酵燕麦组",
  "灭活高剂量组",
  "灭活低剂量组",
  "未灭活高剂量组",
  "未灭活低剂量组",
  "菌液高剂量组",
  "菌液低剂量组",
] as const;

interface DisplaySettings {
  boxTitle: string;
  boxUnit: string;
  barTitle: string;
  barUnit: string;
}

function readDisplaySettings(): DisplaySettings {
  const fallback: DisplaySettings = {
    boxTitle: "",
    boxUnit: "",
    barTitle: "",
    barUnit: "",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(DISPLAY_SETTINGS_KEY) ?? "null") as Partial<DisplaySettings> | null;
    if (!saved) return fallback;
    return {
      boxTitle: typeof saved.boxTitle === "string" ? saved.boxTitle : "",
      boxUnit: typeof saved.boxUnit === "string" ? saved.boxUnit : "",
      barTitle: typeof saved.barTitle === "string" ? saved.barTitle : "",
      barUnit: typeof saved.barUnit === "string" ? saved.barUnit : "",
    };
  } catch {
    return fallback;
  }
}

function labelLines(label: string): string[] {
  const chars = [...label];
  if (chars.length <= 6) return [label];
  return [chars.slice(0, 6).join(""), chars.slice(6, 12).join("")];
}

export default function BoxPlotPage() {
  const [data, setData] = useState<string[][]>(() =>
    GROUP_NAMES.map(() => Array.from({ length: SLOTS }, () => ""))
  );

  const [copiedCol, setCopiedCol] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [copyAllFallback, setCopyAllFallback] = useState("");
  const [batchMessage, setBatchMessage] = useState("");
  const [boxTitle, setBoxTitle] = useState(() => readDisplaySettings().boxTitle);
  const [boxUnit, setBoxUnit] = useState(() => readDisplaySettings().boxUnit);
  const [barTitle, setBarTitle] = useState(() => readDisplaySettings().barTitle);
  const [barUnit, setBarUnit] = useState(() => readDisplaySettings().barUnit);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify({
      boxTitle,
      boxUnit,
      barTitle,
      barUnit,
    } satisfies DisplaySettings));
  }, [boxTitle, boxUnit, barTitle, barUnit]);

  const labelFor = (groupIndex: number) => DISPLAY_LABELS[groupIndex];

  // 复制某一列已填写的数字（竖向换行），空框跳过；粘贴逻辑保持原样不动
  const copyColumn = async (g: number) => {
    const vals = (data[g] ?? [])
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
      const next = GROUP_NAMES.map((_, groupIndex) =>
        Array.from({ length: SLOTS }, (_, slotIndex) => prev[groupIndex]?.[slotIndex] ?? "")
      );
      next[g][i] = v;
      return next;
    });
  };

  const resetAll = () => {
    setData(GROUP_NAMES.map(() => Array.from({ length: SLOTS }, () => "")));
  };

  const parseBatch = () => {
    const result = parseBatchValues(pasteText);
    setPasteErrors(result.errors);
    setBatchMessage(result.errors.length ? "" : `已解析 ${result.values.length} 个位置${result.values.length === 70 ? "，数量正确" : "，请确认数量"}`);
    return result;
  };

  const confirmBatchPaste = () => {
    const result = parseBatchValues(pasteText);
    setPasteErrors(result.errors);
    if (result.errors.length || result.values.length > GROUP_NAMES.length * SLOTS) return;
    const next = GROUP_NAMES.map((_, groupIndex) =>
      Array.from({ length: SLOTS }, (_, slotIndex) => {
        const value = result.values[groupIndex * SLOTS + slotIndex];
        return value === undefined ? "" : String(value);
      })
    );
    setData(next);
    setPasteOpen(false);
    setPasteText("");
    setBatchMessage(`已填入 ${result.values.length} 个位置`);
  };

  const copyAll = async () => {
    const text = flattenBatchValues(data, SLOTS);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopyAllFallback("");
      setBatchMessage("已复制全部 70 个位置");
    } catch {
      setCopyAllFallback(text);
      setBatchMessage("剪贴板不可用，请在下方文本框中全选复制");
    }
  };

  // 粘贴一整列竖排数字：自动依次填入该列 7 个框（从第一个框开始）
  const handlePaste = (g: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const nums = parsePastedNumbers(text);
    if (nums.length === 0) return;
    e.preventDefault();
    setData((prev) => {
      const next = GROUP_NAMES.map((_, groupIndex) =>
        Array.from({ length: SLOTS }, (_, slotIndex) => prev[groupIndex]?.[slotIndex] ?? "")
      );
      nums.slice(0, SLOTS).forEach((v, idx) => {
        next[g][idx] = String(v);
      });
      return next;
    });
  };

  // 解析每组数字（空值不参与）
  const parsed = useMemo(
    () => GROUP_NAMES.map((_, groupIndex) => parseGroupCells(data[groupIndex])),
    [data]
  );

  const stats = useMemo(() => parsed.map((v) => (v.length ? computeStats(v) : null)), [parsed]);

  // 各组 均值 ± 标准差（样本标准差 n-1；n=1 视为样本不足无 SD）
  const meanStd = useMemo<(MeanSd | null)[]>(
    () => parsed.map(computeMeanSd),
    [parsed]
  );

  // 显著性字母（单因素 ANOVA + Tukey HSD 事后检验）；保持箱型图/均值±SD/复制逻辑不变
  const cld = useMemo(() => computeCLD(meanStd), [meanStd]);

  // Y 轴范围（含离群点）
  const domain = useMemo(() => {
    const all = parsed.flat();
    if (all.length === 0) return { min: 0, max: 1 };
    let min = Math.min(...all);
    let max = Math.max(...all);
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }, [parsed]);

  // 均值±标准差 可复制文本
  const meanStdText = useMemo(() => {
    return GROUP_NAMES.map((name, g) => {
      const m = meanStd[g];
      if (!m) return `${name}\t—`;
      if (m.sd === null) return `${name}\t样本不足(n=1)`;
      return `${name}\t${m.mean.toFixed(2)} ± ${m.sd.toFixed(2)}`;
    }).join("\n");
  }, [meanStd]);

  const copyMeanStd = async () => {
    if (!meanStd.some((m) => m && m.sd !== null)) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(meanStdText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = meanStdText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  };

  // 柱形图（均值+标准差误差棒）的 Y 轴范围
  const barDomain = useMemo(() => {
    const valid = meanStd.filter((m): m is MeanSd => m !== null);
    const ext: number[] = [];
    valid.forEach((m) => {
      if (m.sd === null) {
        ext.push(m.mean, m.mean);
      } else {
        ext.push(m.mean - m.sd, m.mean + m.sd);
      }
    });
    if (ext.length === 0) return { min: 0, max: 1 };
    let min = Math.min(...ext);
    let max = Math.max(...ext);
    const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }, [meanStd]);

  // 柱形图几何
  const BW = 760;
  const BH = 400;
  const BM = { left: 52, right: 18, top: 18, bottom: 70 };
  const bPlotW = BW - BM.left - BM.right;
  const bPlotH = BH - BM.top - BM.bottom;
  const bSlot = bPlotW / GROUP_NAMES.length;
  const barW = Math.min(bSlot * 0.5, 38);
  const bYOf = (v: number) =>
    BM.top + (1 - (v - barDomain.min) / (barDomain.max - barDomain.min)) * bPlotH;
  const bYTicks = Array.from(
    { length: 5 },
    (_, i) => barDomain.min + ((barDomain.max - barDomain.min) * i) / 4
  );
  const barHasAny = meanStd.some((m) => m !== null);

  // 图表几何
  const W = 760;
  const H = 400;
  const M = { left: 52, right: 18, top: 18, bottom: 70 };
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
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPasteOpen(true);
                setPasteErrors([]);
                setBatchMessage("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary"
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> 一键粘贴
            </button>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary"
            >
              <Copy className="h-3.5 w-3.5" /> 一键复制
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 清空输入
            </button>
          </div>
        </div>
      </PageHeader>

      {pasteOpen && (
        <section className="mt-4 rounded-xl border border-line bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-primary">批量粘贴 10 组数据</p>
            <button type="button" onClick={() => setPasteOpen(false)} className="text-xs text-ink-faint hover:text-primary">取消</button>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-soft">按固定顺序每组 7 个位置粘贴，共 70 个。空位置请明确写 0；内部空行会被指出，不会自动挤掉。</p>
          <textarea
            value={pasteText}
            onChange={(event) => {
              setPasteText(event.target.value);
              setPasteErrors([]);
              setBatchMessage("");
            }}
            placeholder="每行一个数字，也支持 Tab 分隔"
            rows={7}
            className="mt-3 w-full rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-5 text-ink outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
          {pasteText.trim() && pasteErrors.length === 0 && (() => {
            const count = parseBatchValues(pasteText).values.length;
            return count !== GROUP_NAMES.length * SLOTS ? (
              <p className="mt-2 rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs text-[#806B20]">当前解析到 {count} 个位置，预期 70 个；确认前请检查是否需要补充或删除数据。</p>
            ) : null;
          })()}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={parseBatch} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary">检查数据</button>
            <button type="button" onClick={confirmBatchPaste} disabled={!pasteText.trim() || pasteErrors.length > 0} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-3.5 w-3.5" />确认填入</button>
          </div>
          {pasteErrors.length > 0 && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{pasteErrors.slice(0, 3).map((error) => <p key={error}>{error}</p>)}</div>}
          {batchMessage && <p className="mt-2 text-xs text-ink-soft">{batchMessage}</p>}
          {pasteText.trim() && pasteErrors.length === 0 && (() => {
            const result = parseBatchValues(pasteText);
            if (!result.values.length) return null;
            return <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-soft sm:grid-cols-5">
              {GROUP_NAMES.map((name, groupIndex) => <div key={name} className="rounded-lg bg-surface p-2"><p className="font-medium text-primary">{DISPLAY_LABELS[groupIndex]}</p><p className="mt-1 break-all font-mono">{Array.from({ length: SLOTS }, (_, slotIndex) => result.values[groupIndex * SLOTS + slotIndex] ?? "—").join(" · ")}</p></div>)}
            </div>;
          })()}
        </section>
      )}
      {copyAllFallback && (
        <section className="mt-3 rounded-xl border border-line bg-card p-4 shadow-card">
          <p className="text-xs text-ink-soft">复制失败，请全选下面 70 行内容后手动复制。</p>
          <textarea readOnly value={copyAllFallback} onFocus={(event) => event.currentTarget.select()} rows={7} className="mt-2 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs leading-5 text-ink" aria-label="全部分组数据" />
        </section>
      )}
      {batchMessage && !pasteOpen && <p className="mt-2 text-center text-xs text-ink-soft">{batchMessage}</p>}

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
                  value={data[g]?.[i] ?? ""}
                  onChange={(e) => setCell(g, i, e.target.value)}
                  onPaste={(e) => handlePaste(g, e)}
                  placeholder={`#${i + 1}`}
                  className="h-8 w-full rounded-md border border-line bg-surface px-2 text-center text-[13px] tabular text-ink outline-none transition duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ink-faint">
              已录入 {(data[g] ?? []).filter((value) => value.trim() !== "").length}/{SLOTS}
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

      <BoxplotAnalysisBoundary resetKey={JSON.stringify(data)}>
      {/* 图表区 */}
      <div className="mt-6 rounded-xl border border-line bg-card p-4 shadow-card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <input
              value={boxTitle}
              onChange={(event) => setBoxTitle(event.target.value)}
              placeholder="图表标题（可选）"
              aria-label="箱型图标题"
              className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-primary outline-none transition focus:border-primary/30 focus:bg-surface"
            />
            <input
              value={boxUnit}
              onChange={(event) => setBoxUnit(event.target.value)}
              placeholder="单位（可选，如 ng/mL）"
              aria-label="箱型图单位"
              className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-ink-faint outline-none transition focus:border-primary/30 focus:bg-surface"
            />
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-ink-soft">
          {BOXPLOT_TREATMENT_LEGEND.map(({ label, palette }) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border"
                style={{ backgroundColor: palette.fill, borderColor: palette.stroke }}
              />
              {label}
            </span>
          ))}
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
              const palette = BOXPLOT_GROUP_PALETTE[g];
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
                  <text x={cx} y={M.top + plotH + 18} textAnchor="middle" fontSize={10} fill="#666666">
                    {labelLines(labelFor(g)).map((line, index) => (
                      <tspan key={index} x={cx} dy={index === 0 ? 0 : 12}>{line}</tspan>
                    ))}
                  </text>

                  {s && s.values.length > 0 && (
                    <>
                      {s.values.length === 1 ? (
                        <circle cx={cx} cy={yOf(s.q2)} r={3.5} fill={palette.stroke} />
                      ) : (
                        <>
                          {/* 须线 */}
                          <line
                            x1={cx}
                            y1={yOf(s.q3)}
                            x2={cx}
                            y2={yOf(s.whiskerHigh)}
                            stroke={palette.stroke}
                            strokeWidth={1.5}
                          />
                          <line
                            x1={cx}
                            y1={yOf(s.q1)}
                            x2={cx}
                            y2={yOf(s.whiskerLow)}
                            stroke={palette.stroke}
                            strokeWidth={1.5}
                          />
                          {/* 须端短横 */}
                          <line
                            x1={cx - boxW / 3}
                            y1={yOf(s.whiskerHigh)}
                            x2={cx + boxW / 3}
                            y2={yOf(s.whiskerHigh)}
                            stroke={palette.stroke}
                            strokeWidth={1.5}
                          />
                          <line
                            x1={cx - boxW / 3}
                            y1={yOf(s.whiskerLow)}
                            x2={cx + boxW / 3}
                            y2={yOf(s.whiskerLow)}
                            stroke={palette.stroke}
                            strokeWidth={1.5}
                          />
                          {/* 箱体 */}
                          <rect
                            x={cx - boxW / 2}
                            y={yOf(s.q3)}
                            width={boxW}
                            height={Math.max(1, yOf(s.q1) - yOf(s.q3))}
                            fill={palette.fill}
                            stroke={palette.stroke}
                            strokeWidth={1.5}
                          />
                          {/* 中位数 */}
                          <line
                            x1={cx - boxW / 2}
                            y1={yOf(s.q2)}
                            x2={cx + boxW / 2}
                            y2={yOf(s.q2)}
                            stroke={palette.stroke}
                            strokeWidth={2}
                          />
                        </>
                      )}
                      {/* 离群点 */}
                      {s.outliers.map((o, k) => (
                        <circle
                          key={k}
                          cx={cx}
                          cy={yOf(o)}
                          r={3}
                          fill={palette.stroke}
                          stroke={palette.fill}
                          strokeWidth={0.8}
                        />
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

      {/* 各组 均值 ± 标准差 文本区（可一键复制） */}
      <div className="mt-6 rounded-xl border border-line bg-card p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">各组 均值 ± 标准差</p>
          <button
            type="button"
            onClick={copyMeanStd}
            disabled={!meanStd.some((m) => m && m.sd !== null)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition duration-200 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedText ? "已复制 ✓" : "复制全部"}
          </button>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-lg bg-surface p-3 text-[12px] leading-relaxed text-ink tabular">
{meanStdText}
        </pre>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          共 {GROUP_NAMES.length} 组：n≥2 输出「均值 ± 标准差」(保留 2 位小数)，n=1 提示「样本不足」，空组标记 — 。点击「复制全部」可粘贴到 GraphPad / 文档。
        </p>
      </div>

      {/* 均值 ± 标准差 柱形误差棒图（独立图表） */}
      <div className="mt-6 rounded-xl border border-line bg-card p-4 shadow-card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <input
              value={barTitle}
              onChange={(event) => setBarTitle(event.target.value)}
              placeholder="图表标题（可选）"
              aria-label="柱形图标题"
              className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-primary outline-none transition focus:border-primary/30 focus:bg-surface"
            />
            <input
              value={barUnit}
              onChange={(event) => setBarUnit(event.target.value)}
              placeholder="单位（可选，如 ng/mL）"
              aria-label="柱形图单位"
              className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-ink-faint outline-none transition focus:border-primary/30 focus:bg-surface"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full min-w-[640px]" role="img" aria-label="均值标准差柱形图">
            {/* Y 轴网格刻度 */}
            {bYTicks.map((t, i) => {
              const y = bYOf(t);
              return (
                <g key={`byt${i}`}>
                  <line x1={BM.left} y1={y} x2={BW - BM.right} y2={y} stroke="#E2E5EC" strokeWidth={1} />
                  <text x={BM.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#9AA1A8">
                    {Number.isInteger(t) ? t : t.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 坐标轴 */}
            <line x1={BM.left} y1={BM.top} x2={BM.left} y2={BM.top + bPlotH} stroke="#9AA1A8" strokeWidth={1} />
            <line x1={BM.left} y1={BM.top + bPlotH} x2={BW - BM.right} y2={BM.top + bPlotH} stroke="#9AA1A8" strokeWidth={1} />

            {/* 每个分组柱子 + 误差棒 */}
            {GROUP_NAMES.map((name, g) => {
              const cx = BM.left + (g + 0.5) * bSlot;
              const m = meanStd[g];
              const palette = BOXPLOT_GROUP_PALETTE[g];
              return (
                <g key={name}>
                  {/* X 轴刻度 */}
                  <line x1={cx} y1={BM.top + bPlotH} x2={cx} y2={BM.top + bPlotH + 4} stroke="#9AA1A8" strokeWidth={1} />
                  {/* 组名 */}
                  <text x={cx} y={BM.top + bPlotH + 18} textAnchor="middle" fontSize={10} fill="#666666">
                    {labelLines(labelFor(g)).map((line, index) => (
                      <tspan key={index} x={cx} dy={index === 0 ? 0 : 12}>{line}</tspan>
                    ))}
                  </text>

                  {m && (
                    <>
                      {/* 柱子（均值） */}
                      <rect
                        x={cx - barW / 2}
                        y={bYOf(m.mean)}
                        width={barW}
                        height={Math.max(1, BM.top + bPlotH - bYOf(m.mean))}
                        fill={palette.fill}
                        stroke={palette.stroke}
                        strokeWidth={1.5}
                      />
                      {/* 误差棒（均值 ± 标准差） */}
                      {m.sd !== null && (
                        <>
                          <line
                            x1={cx}
                            y1={bYOf(m.mean + m.sd)}
                            x2={cx}
                            y2={bYOf(m.mean - m.sd)}
                            stroke={palette.stroke}
                            strokeWidth={2}
                          />
                          <line
                            x1={cx - barW / 3}
                            y1={bYOf(m.mean + m.sd)}
                            x2={cx + barW / 3}
                            y2={bYOf(m.mean + m.sd)}
                            stroke={palette.stroke}
                            strokeWidth={2}
                          />
                          <line
                            x1={cx - barW / 3}
                            y1={bYOf(m.mean - m.sd)}
                            x2={cx + barW / 3}
                            y2={bYOf(m.mean - m.sd)}
                            stroke={palette.stroke}
                            strokeWidth={2}
                          />
                        </>
                      )}
                      {/* 显著性字母（Tukey HSD 事后检验） */}
                      {cld.labels[g] && (
                        <text
                          x={cx}
                          y={Math.max(BM.top + 6, bYOf(m.sd !== null ? m.mean + m.sd : m.mean) - 12)}
                          textAnchor="middle"
                          fontSize={13}
                          fontWeight={700}
                          fill={palette.stroke}
                        >
                          {cld.labels[g]}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {!barHasAny && (
              <text x={BW / 2} y={BH / 2} textAnchor="middle" fontSize={13} fill="#9AA1A8">
                在上方输入数字，柱形图将实时生成
              </text>
            )}
          </svg>
        </div>
        {cld.error ? (
          <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            当前数据的显著性分析暂时无法完成。你已输入的数据仍然保留，可以继续修改后重试。
          </p>
        ) : cld.ok ? (
          <p className="mx-1 mt-2 rounded-lg bg-[#EDF2EF] px-3 py-2 text-[11px] leading-5 text-ink-faint">
            柱顶字母为显著性标注（单因素 ANOVA + Tukey HSD 事后检验，α=0.05，Tukey–Kramer 校正）；相同字母表示组间差异不显著。
          </p>
        ) : (
          barHasAny && (
          <p className="mx-1 mt-2 rounded-lg bg-[#EDF2EF] px-3 py-2 text-[11px] leading-5 text-ink-faint">
              注：{cld.reason}，暂不标注显著性字母。
            </p>
          )
        )}
      </div>
      </BoxplotAnalysisBoundary>

      <section className="mt-6 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5" aria-label="分组图例">
        <h2 className="text-sm font-medium text-primary">分组图例</h2>
        <div className="mt-3 grid grid-cols-1 gap-y-2.5">
          {LEGEND_LABELS.map((label, index) => {
            const palette = BOXPLOT_GROUP_PALETTE[index];
            return (
              <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5">
                <span
                  className="h-4 w-7 shrink-0 rounded-sm border"
                  style={{ backgroundColor: palette.fill, borderColor: palette.stroke }}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap text-sm leading-5 text-ink">{label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
