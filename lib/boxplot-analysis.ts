export type GroupStats = {
  values: number[];
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
};

export type MeanSd = { mean: number; sd: number | null; n: number };

export type CldResult = {
  labels: string[];
  ok: boolean;
  reason: string;
  error?: boolean;
};

const VALUE_SEPARATOR = /[\s,;，；\t\r\n]+/;

export function parsePastedNumbers(text: string): number[] {
  return text
    .split(VALUE_SEPARATOR)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);
}

export function parseGroupCells(row: unknown): number[] {
  if (!Array.isArray(row)) return [];
  return row.flatMap((value) => {
    const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
    if (!text) return [];
    const number = Number(text);
    return Number.isFinite(number) ? [number] : [];
  });
}

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

export function computeStats(values: number[]): GroupStats | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lf = q1 - 1.5 * iqr;
  const uf = q3 + 1.5 * iqr;
  const inliers = sorted.filter((value) => value >= lf && value <= uf);
  const whiskerLow = inliers.length ? inliers[0] : q1;
  const whiskerHigh = inliers.length ? inliers[inliers.length - 1] : q3;
  const outliers = sorted.filter((value) => value < lf || value > uf);
  return { values: sorted, q1, q2, q3, iqr, whiskerLow, whiskerHigh, outliers };
}

export function computeMeanSd(values: number[]): MeanSd | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  if (finite.length === 1) return { mean, sd: null, n: 1 };
  const variance =
    finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (finite.length - 1);
  return { mean, sd: Math.sqrt(variance), n: finite.length };
}

// ---------- 显著性字母：单因素 ANOVA + Tukey HSD 事后检验（compact letter display） ----------
const LG_G = 7;
const LG_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

function lgamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = LG_C[0];
  for (let i = 1; i < LG_G + 2; i++) x += LG_C[i] / (z + i);
  const t = z + LG_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

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

function tCdf(t: number, nu: number): number {
  const x = nu / (nu + t * t);
  const ib = betai(nu / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

function tPdf(t: number, nu: number): number {
  const c = Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2)) / Math.sqrt(nu * Math.PI);
  return c * Math.pow(1 + (t * t) / nu, -(nu + 1) / 2);
}

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

// Bron–Kerbosch：邻接矩阵不含自环，递归时顶点不会再次进入自己的候选集。
export function maximalCliques(adj: boolean[][]): number[][] {
  const n = adj.length;
  const result: number[][] = [];
  const isAdjacent = (a: number, b: number) => a !== b && adj[a]?.[b] === true;

  const bronk = (r: number[], p: number[], x: number[]) => {
    if (p.length === 0 && x.length === 0) {
      result.push([...r]);
      return;
    }

    const union = [...new Set([...p, ...x])];
    let pivot = -1;
    let best = -1;
    for (const candidate of union) {
      const neighborsInP = p.reduce(
        (count, vertex) => count + (isAdjacent(candidate, vertex) ? 1 : 0),
        0
      );
      if (neighborsInP > best) {
        best = neighborsInP;
        pivot = candidate;
      }
    }

    const candidates = p.filter((vertex) => pivot === -1 || !isAdjacent(pivot, vertex));
    for (const vertex of candidates) {
      bronk(
        [...r, vertex],
        p.filter((other) => isAdjacent(vertex, other)),
        x.filter((other) => isAdjacent(vertex, other))
      );
      p = p.filter((other) => other !== vertex);
      if (!x.includes(vertex)) x.push(vertex);
    }
  };

  bronk([], Array.from({ length: n }, (_, i) => i), []);
  return result;
}

export function computeCLD(groups: (MeanSd | null)[], alpha = 0.05): CldResult {
  const labels = groups.map(() => "");
  try {
    const idxs: { i: number; m: MeanSd }[] = [];
    groups.forEach((m, i) => {
      if (
        m &&
        Number.isFinite(m.mean) &&
        Number.isInteger(m.n) &&
        m.n > 0 &&
        (m.sd === null || Number.isFinite(m.sd))
      ) {
        idxs.push({ i, m });
      }
    });

    const k = idxs.length;
    if (k < 2) return { labels, ok: false, reason: "至少需要 2 组有效数据" };
    const totalN = idxs.reduce((sum, group) => sum + group.m.n, 0);
    let ssWithin = 0;
    idxs.forEach(({ m }) => {
      if (m.n >= 2 && m.sd !== null) ssWithin += (m.n - 1) * m.sd * m.sd;
    });
    const dfWithin = totalN - k;
    if (dfWithin < 1) {
      return { labels, ok: false, reason: "误差自由度不足（每组至少需 ≥2 个有效值）" };
    }
    const mse = ssWithin / dfWithin;
    if (!Number.isFinite(mse) || mse < 0) {
      return { labels, ok: false, reason: "当前数据无法完成显著性计算" };
    }

    const grid = buildSRGrid(dfWithin);
    const qc = qCritical(k, dfWithin, alpha, grid);
    if (!Number.isFinite(qc)) {
      return { labels, ok: false, reason: "当前数据无法完成显著性计算" };
    }

    const adj: boolean[][] = Array.from({ length: k }, () => new Array(k).fill(false));
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        const se = Math.sqrt(mse * 0.5 * (1 / idxs[a].m.n + 1 / idxs[b].m.n));
        const hsd = qc * se;
        const significant = Math.abs(idxs[a].m.mean - idxs[b].m.mean) > hsd;
        adj[a][b] = !significant;
        adj[b][a] = !significant;
      }
    }

    const cliques = maximalCliques(adj).filter((clique) => clique.length > 0);
    cliques.sort((left, right) => {
      const leftMean = Math.max(...left.map((index) => idxs[index].m.mean));
      const rightMean = Math.max(...right.map((index) => idxs[index].m.mean));
      return rightMean - leftMean;
    });

    const letters: Record<number, string[]> = {};
    cliques.forEach((clique, index) => {
      const letter = String.fromCharCode(97 + index);
      clique.forEach((vertex) => (letters[vertex] ??= []).push(letter));
    });
    idxs.forEach(({ i }, vertex) => {
      labels[i] = (letters[vertex] ?? []).sort().join("");
    });
    return { labels, ok: true, reason: "" };
  } catch (error) {
    console.error("箱型图显著性计算失败", error);
    return { labels, ok: false, reason: "显著性分析暂时无法完成，输入数据仍已保留", error: true };
  }
}
