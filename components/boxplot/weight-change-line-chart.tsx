"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Clipboard, Download, FileImage, FileText, RotateCcw } from "lucide-react";
import {
  buildLineChartPdf,
  buildLineChartSvg,
  calculateLineStats,
  emptyLineMatrix,
  LINE_ANIMALS_PER_GROUP,
  LINE_GROUPS,
  LINE_GROUPS_COLORS,
  LINE_MARKERS,
  LINE_ROWS,
  LINE_SVG_HEIGHT,
  LINE_SVG_WIDTH,
  LINE_WEEKS,
  lineMatrixToTsv,
  normalizeLineMatrix,
  parseLinePaste,
  type LineErrorMode,
} from "@/lib/weight-change-line-chart";

const STORAGE_KEY = "boxplot.weight-change-line-chart.v1";

interface PersistedLineChart {
  data: string[][];
  letters: string[];
  errorMode: LineErrorMode;
}

function readPersisted(): PersistedLineChart {
  const fallback: PersistedLineChart = { data: emptyLineMatrix(), letters: LINE_GROUPS.map(() => ""), errorMode: "sem" };
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PersistedLineChart> | null;
    if (!value) return fallback;
    return {
      data: normalizeLineMatrix(value.data),
      letters: LINE_GROUPS.map((_, index) => typeof value.letters?.[index] === "string" ? value.letters[index] : ""),
      errorMode: value.errorMode === "sd" ? "sd" : "sem",
    };
  } catch {
    return fallback;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPng(svg: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图像加载失败"));
    });
    const canvas = document.createElement("canvas");
    const width = 6000;
    canvas.width = width;
    canvas.height = Math.round(width * LINE_SVG_HEIGHT / LINE_SVG_WIDTH);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持画布导出");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("PNG 生成失败");
    downloadBlob(png, "weight_change_600dpi.png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function WeightChangeLineChart() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<string[][]>(() => emptyLineMatrix());
  const [letters, setLetters] = useState<string[]>(() => LINE_GROUPS.map(() => ""));
  const [errorMode, setErrorMode] = useState<LineErrorMode>("sem");
  const [pasteText, setPasteText] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readPersisted();
    setData(saved.data);
    setLetters(saved.letters);
    setErrorMode(saved.errorMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, letters, errorMode } satisfies PersistedLineChart));
  }, [data, letters, errorMode, hydrated]);

  const stats = useMemo(() => calculateLineStats(data), [data]);
  const svg = useMemo(() => buildLineChartSvg(stats, letters, errorMode), [stats, letters, errorMode]);
  const pasteResult = useMemo(() => pasteText ? parseLinePaste(pasteText) : null, [pasteText]);

  const setCell = (row: number, week: number, value: string) => {
    setData((current) => current.map((source, index) => index === row ? source.map((cell, col) => col === week ? value : cell) : source));
  };

  const applyPaste = () => {
    if (!pasteResult || pasteResult.warnings.length > 0 || pasteResult.rowCount !== LINE_ROWS || pasteResult.columnCount !== LINE_WEEKS.length) {
      setPasteMessage("数据区域需要严格为 70 行 × 7 列，且只能包含数字或空白。");
      return;
    }
    setData(pasteResult.matrix);
    setPasteMessage("已填入 70 行 × 7 列原始数据。");
  };

  const copyAll = async () => {
    const text = lineMatrixToTsv(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback("");
      setFeedback("已复制全部 70 行 × 7 列数据");
    } catch {
      setCopyFallback(text);
      setFeedback("剪贴板不可用，请使用下方文本框手动复制");
    }
  };

  const reset = () => {
    setData(emptyLineMatrix());
    setLetters(LINE_GROUPS.map(() => ""));
    setPasteText("");
    setFeedback("已清空折线图数据");
  };

  const exportSvg = () => {
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "weight_change_line_chart.svg");
    setFeedback("已导出 SVG 矢量图");
  };

  const exportPdf = () => {
    downloadBlob(new Blob([buildLineChartPdf(stats, letters, errorMode)], { type: "application/pdf" }), "weight_change_line_chart.pdf");
    setFeedback("已导出 PDF 矢量图");
  };

  const exportPng = async () => {
    try {
      await downloadPng(svg);
      setFeedback("已导出 600 DPI PNG");
    } catch {
      setFeedback("PNG 导出失败，请改用 SVG 或 PDF");
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-line bg-card shadow-card" aria-label="科研体重变化率折线图">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5">
        <span>
          <span className="block text-sm font-medium text-primary">科研体重变化率折线图</span>
          <span className="mt-1 block text-xs text-ink-faint">10 组 × 7 只动物 × 7 个时间点 · Week 1 基线</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-line px-4 pb-5 pt-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-soft">粘贴 Excel 的 70 行 × 7 列原始值；空白保留为空，0 为有效数据。</p>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary"><RotateCcw className="h-3.5 w-3.5" />清空</button>
          </div>
          <textarea
            value={pasteText}
            onChange={(event) => { setPasteText(event.target.value); setPasteMessage(""); }}
            placeholder="从 Excel 直接粘贴 70 行 × 7 列数据"
            rows={5}
            className="mt-3 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs leading-5 text-ink outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            aria-label="体重变化率原始数据批量粘贴区"
          />
          {pasteResult && <p className={`mt-2 text-xs ${pasteResult.warnings.length ? "text-red-700" : "text-ink-soft"}`}>{pasteResult.warnings[0] ?? `已识别 ${pasteResult.rowCount} 行 × ${pasteResult.columnCount} 列`}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={applyPaste} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-white"><Clipboard className="h-3.5 w-3.5" />确认填入</button>
            <button type="button" onClick={copyAll} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary"><Clipboard className="h-3.5 w-3.5" />一键复制全部</button>
          </div>
          {pasteMessage && <p className="mt-2 text-xs text-ink-soft">{pasteMessage}</p>}
          {copyFallback && <textarea readOnly value={copyFallback} onFocus={(event) => event.currentTarget.select()} rows={4} className="mt-2 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs leading-5 text-ink" aria-label="折线图全部数据复制备用文本" />}

          <div className="mt-5 overflow-x-auto rounded-lg border border-line">
            <table className="min-w-[760px] w-full border-collapse text-[11px]">
              <thead className="bg-surface text-ink-soft">
                <tr><th className="sticky left-0 z-10 border-b border-line bg-surface px-2 py-2 text-left">Group / animal</th>{LINE_WEEKS.map((week) => <th key={week} className="border-b border-line px-2 py-2 text-center">{week}</th>)}</tr>
              </thead>
              {LINE_GROUPS.map((group, groupIndex) => (
                <tbody key={group}>
                  {Array.from({ length: LINE_ANIMALS_PER_GROUP }, (_, animalIndex) => {
                    const row = groupIndex * LINE_ANIMALS_PER_GROUP + animalIndex;
                    return <tr key={row} className="border-b border-line last:border-0">
                      <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-ink">{group} · {animalIndex + 1}</th>
                      {LINE_WEEKS.map((week, weekIndex) => <td key={week} className="px-1 py-1"><input type="number" step="any" inputMode="decimal" value={data[row]?.[weekIndex] ?? ""} onChange={(event) => setCell(row, weekIndex, event.target.value)} className="h-8 w-full rounded-md border border-line bg-surface px-1 text-center tabular text-ink outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15" aria-label={`${group} animal ${animalIndex + 1} ${week}`} /></td>)}
                    </tr>;
                  })}
                </tbody>
              ))}
            </table>
          </div>

          <div className="mt-4 grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="text-xs font-medium text-ink">误差线</label>
            <select value={errorMode} onChange={(event) => setErrorMode(event.target.value as LineErrorMode)} className="h-9 rounded-md border border-line bg-card px-2 text-xs text-ink outline-none focus:border-primary/50">
              <option value="sem">SEM（默认）</option><option value="sd">SD</option>
            </select>
            <span className="text-xs font-medium text-ink sm:col-span-2">Week 7 显著性字母</span>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-5">
              {LINE_GROUPS.map((group, index) => <label key={group} className="text-[11px] text-ink-soft"><span className="mb-1 block">{group}</span><input value={letters[index]} onChange={(event) => setLetters((current) => current.map((letter, i) => i === index ? event.target.value : letter))} placeholder="a / ab" className="h-8 w-full rounded-md border border-line bg-card px-2 text-xs text-ink outline-none focus:border-primary/50" /></label>)}
            </div>
          </div>

          {stats.invalidBaselines.length > 0 && <p className="mt-3 rounded-lg border border-[#E8D89A] bg-[#FFF6D6] px-3 py-2 text-xs leading-5 text-[#806B20]">以下动物的 Week 1 基线为空、非数字或为 0，无法计算变化率：{stats.invalidBaselines.slice(0, 8).join("、")}{stats.invalidBaselines.length > 8 ? "等" : ""}。</p>}
          {stats.invalidValues.length > 0 && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">检测到无法解析的原始值：{stats.invalidValues.slice(0, 5).join("、")}{stats.invalidValues.length > 5 ? "等" : ""}。</p>}

          <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white p-2">
            <div className="min-w-[920px]" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void exportPng()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-white"><FileImage className="h-3.5 w-3.5" />PNG 600 DPI</button>
            <button type="button" onClick={exportSvg} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary"><Download className="h-3.5 w-3.5" />SVG</button>
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary"><FileText className="h-3.5 w-3.5" />PDF</button>
          </div>
          {feedback && <p className="mt-2 text-xs text-ink-soft">{feedback}</p>}
          <p className="mt-3 text-[11px] leading-5 text-ink-faint">Week 1 按每只动物自己的原始值计算基线变化率；Week 2 的灰色虚线标记 OVX surgery。图例、误差线和 Week 7 字母均固定在导出图内。</p>
        </div>
      )}
    </section>
  );
}
