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

const SLOTS = 7; // 每组最多 7 个数据

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

// ---------- 显著性字母：单因素 ANOVA + Tukey HSD 事后检验（compact letter display）----------
type MeanSd = { mean: number; sd: number | null; n: number };

// Lanczos 近似 ln Γ(x)
const _LG_G = 7;
const _LG_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];
function lgamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = _LG_C[0];
  for (let i = 1; i < _LG_G + 2; i++) x += _LG_C[i] / (z + i);
  const t = z + _LG_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// 正则化不完全 Beta 函数 I_x(a,b)（Numerical Recipes 连分式）
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// t 分布 CDF / PDF（ν 自由度）
function tCdf(t: number, nu: number): number {
  const x = nu / (nu + t * t);
  const ib = betai(nu / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}
function tPdf(t: number, nu: number): number {
  const c = Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2)) / Math.sqrt(nu * Math.PI);
  return c * Math.pow(1 + (t * t) / nu, -(nu + 1) / 2);
}

// 学生化极差分布 CDF：F(q;k,ν) = k ∫ f_t(z)[F_t(z+q)-F_t(z)]^{k-1} dz
type SRGrid = { zs: number[]; fs: number[]; Fs: number[]; dz: number };
function buildSRGrid(nu: number): SRGrid {
  const Z = nu <= 3 ? 100 : 60;
  const n = nu <= 3 ? 4000 : 2400;
  const dz = (2 * Z) / n;
  const zs = new Array(n + 1), fs = new Array(n + 1), Fs = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const z = -Z + i * dz;
    zs[i] = z;
    fs[i] = tPdf(z, nu);
    Fs[i] = tCdf(z, nu);
  }
  return { zs, fs, Fs, dz };
}
function interpCdf(grid: SRGrid, x: number): number {
  const { zs, Fs } = grid;
  if (x <= zs[0]) return 0;
  if (x >= zs[zs.length - 1]) return 1;
  const pos = (x - zs[0]) / grid.dz;
  const i = Math.floor(pos);
  const frac = pos - i;
  return Fs[i] + frac * (Fs[i + 1] - Fs[i]);
}
function srCdf(q: number, k: number, grid: SRGrid): number {
  const { zs, fs, Fs, dz } = grid;
  let sum = 0;
  const km1 = k - 1;
  for (let i = 0; i < zs.length; i++) {
    const Fzq = interpCdf(grid, zs[i] + q);
    let d = Fzq - Fs[i];
    if (d < 0) d = 0; else if (d > 1) d = 1;
    sum += fs[i] * Math.pow(d, km1);
  }
  return k * sum * dz;
}
function qCritical(k: number, nu: number, alpha: number, grid: SRGrid): number {
  const target = 1 - alpha;
  let lo = 0, hi = 60;
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2;
    if (srCdf(mid, k, grid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Bron–Kerbosch 求所有极大团（用于把"非显著"图转成紧凑字母标注）
function maximalCliques(adj: boolean[][]): number[][] {
  const n = adj.length;
  const result: number[][] = [];
  const bronk = (r: number[], p: number[], x: number[]) => {
    if (p.length === 0 && x.length === 0) { result.push([...r]); return; }
    const union = [...p, ...x];
    let u = -1, best = -1;
    for (const v of union) {
      let c = 0;
      for (const w of p) if (adj[v][w]) c++;
      if (c > best) { best = c; u = v; }
    }
    const pcopy = [...p];
    for (const v of pcopy) {
      if (u !== -1 && !adj[u][v]) continue;
      r.push(v);
      const p2 = p.filter((w) => adj[v][w]);
      const x2 = x.filter((w) => adj[v][w]);
      bronk(r, p2, x2);
      r.pop();
      p.splice(p.indexOf(v), 1);
      x.push(v);
    }
  };
  bronk([], Array.from({ length: n }, (_, i) => i), []);
  return result;
}

/**
 * 计算显著性字母（compact letter display）：
 * - 仅基于 均值/标准差/样本量（无需原始明细），做单因素 ANOVA + Tukey–Kramer HSD。
 * - 返回与 GROUP_NAMES 等长的字符串数组；无数据组为 ""。
 * - 无法计算（组数<2 或 误差自由度<1）时返回全空，并在外部用 reason 提示。
 */
function computeCLD(
  groups: (MeanSd | null)[],
  alpha = 0.05
): { labels: string[]; ok: boolean; reason: string } {
  const idxs: { i: number; m: MeanSd }[] = [];
  groups.forEach((m, i) => { if (m) idxs.push({ i, m }); });
  const labels = groups.map(() => "");
  const k = idxs.length;
  if (k < 2) return { labels, ok: false, reason: "至少需要 2 组有效数据" };
  const N = idxs.reduce((s, x) => s + x.m.n, 0);
  const grandMean = idxs.reduce((s, x) => s + x.m.mean * x.m.n, 0) / N;
  let ssWithin = 0;
  idxs.forEach((x) => {
    if (x.m.n >= 2 && x.m.sd !== null) ssWithin += (x.m.n - 1) * x.m.sd * x.m.sd;
  });
  const dfWithin = N - k;
  if (dfWithin < 1) return { labels, ok: false, reason: "误差自由度不足（每组至少需 ≥2 个有效值）" };
  const MSE = ssWithin / dfWithin;
  const grid = buildSRGrid(dfWithin);
  const qc = qCritical(k, dfWithin, alpha, grid);
  // 非显著性邻接矩阵（含自环）
  const n = k;
  const adj: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let a = 0; a < n; a++) {
    adj[a][a] = true;
    for (let b = a + 1; b < n; b++) {
      const se = Math.sqrt(MSE * 0.5 * (1 / idxs[a].m.n + 1 / idxs[b].m.n));
      const hsd = qc * se;
      const sig = Math.abs(idxs[a].m.mean - idxs[b].m.mean) > hsd;
      adj[a][b] = !sig;
      adj[b][a] = !sig;
    }
  }
  // 极大团 → 字母
  const cliques = maximalCliques(adj);
  cliques.sort((A, B) => {
    const mA = Math.max(...A.map((v) => idxs[v].m.mean));
    const mB = Math.max(...B.map((v) => idxs[v].m.mean));
    return mB - mA;
  });
  const letterOf: Record<number, string[]> = {};
  cliques.forEach((cl, ci) => {
    const letter = String.fromCharCode(97 + ci); // a,b,c...
    cl.forEach((v) => {
      (letterOf[v] = letterOf[v] || []).push(letter);
    });
  });
  idxs.forEach(({ i }, vi) => {
    labels[i] = (letterOf[vi] || []).sort().join("");
  });
  return { labels, ok: true, reason: "" };
}

export default function BoxPlotPage() {
  const [data, setData] = useState<string[][]>(() =>
    GROUP_NAMES.map(() => Array.from({ length: SLOTS }, () => ""))
  );

  const [copiedCol, setCopiedCol] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);

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

  // 各组 均值 ± 标准差（样本标准差 n-1；n=1 视为样本不足无 SD）
  type MeanStd = { mean: number; sd: number | null; n: number };
  const meanStd = useMemo<(MeanStd | null)[]>(() => {
    return parsed.map((vals) => {
      if (vals.length === 0) return null;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (vals.length === 1) return { mean, sd: null, n: 1 };
      const variance =
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1);
      return { mean, sd: Math.sqrt(variance), n: vals.length };
    });
  }, [parsed]);

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
    const valid = meanStd.filter((m): m is MeanStd => m !== null);
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
  const BM = { left: 52, right: 18, top: 18, bottom: 56 };
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
      <div className="mt-6 rounded-xl border border-line bg-card p-4 shadow-card">
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
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">均值 ± 标准差 · 柱形误差棒图</p>
          <div className="flex items-center gap-4 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-primary/70" /> 均值
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-gold" /> 标准差
            </span>
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
              return (
                <g key={name}>
                  {/* X 轴刻度 */}
                  <line x1={cx} y1={BM.top + bPlotH} x2={cx} y2={BM.top + bPlotH + 4} stroke="#9AA1A8" strokeWidth={1} />
                  {/* 组名 */}
                  <text x={cx} y={BM.top + bPlotH + 20} textAnchor="middle" fontSize={10} fill="#666666">
                    {name}
                  </text>

                  {m && (
                    <>
                      {/* 柱子（均值） */}
                      <rect
                        x={cx - barW / 2}
                        y={bYOf(m.mean)}
                        width={barW}
                        height={Math.max(1, BM.top + bPlotH - bYOf(m.mean))}
                        fill="#1A3F90"
                        fillOpacity={0.2}
                        stroke="#1A3F90"
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
                            stroke="#E6C260"
                            strokeWidth={2}
                          />
                          <line
                            x1={cx - barW / 3}
                            y1={bYOf(m.mean + m.sd)}
                            x2={cx + barW / 3}
                            y2={bYOf(m.mean + m.sd)}
                            stroke="#E6C260"
                            strokeWidth={2}
                          />
                          <line
                            x1={cx - barW / 3}
                            y1={bYOf(m.mean - m.sd)}
                            x2={cx + barW / 3}
                            y2={bYOf(m.mean - m.sd)}
                            stroke="#E6C260"
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
                          fill="#1A3F90"
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
        {cld.ok ? (
          <p className="mt-1.5 text-[11px] text-ink-faint">
            柱顶字母为显著性标注（单因素 ANOVA + Tukey HSD 事后检验，α=0.05，Tukey–Kramer 校正）；相同字母表示组间差异不显著。
          </p>
        ) : (
          barHasAny && (
            <p className="mt-1.5 text-[11px] text-ink-faint">
              注：{cld.reason}，暂不标注显著性字母。
            </p>
          )
        )}
      </div>
    </div>
  );
}
