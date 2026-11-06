import {
  LINE_ANIMALS_PER_GROUP,
  LINE_GROUPS,
  LINE_WEEKS,
  normalizeLineMatrix,
} from "./weight-change-line-chart";
import { tukeyPValue } from "./boxplot-analysis";

type Matrix = number[][];

export interface LmmEffectResult {
  effect: string;
  df1: number;
  df2: number;
  statistic: number;
  pValue: number;
}

export interface LmmComparison {
  groupA: string;
  groupB: string;
  time: string;
  estimate: number;
  se: number;
  statistic: number;
  pValue: number;
  adjustedP: number;
}

export interface LmmTimeComparison {
  group: string;
  time: string;
  estimate: number;
  se: number;
  statistic: number;
  pValue: number;
  adjustedP: number;
}

export interface WeightChangeLmmResult {
  ok: boolean;
  message: string;
  n: number;
  mouseCount: number;
  missingCount: number;
  missingRate: number;
  invalidBaselineCount: number;
  rho: number;
  residualVariance: number;
  randomVariance: number;
  dfResidual: number;
  effects: LmmEffectResult[];
  groupComparisons: LmmComparison[];
  baselineComparisons: LmmTimeComparison[];
  week7Letters: string[];
  warnings: string[];
}

interface Observation {
  group: number;
  time: number;
  mouse: number;
  value: number;
}

interface Fit {
  beta: number[];
  covariance: Matrix;
  rho: number;
  residualVariance: number;
  randomVariance: number;
  dfResidual: number;
  observations: Observation[];
  design: Matrix;
}

const GROUP_PARAMETER_START = 1;
const TIME_PARAMETER_START = 10;
const INTERACTION_PARAMETER_START = 16;
const PARAMETER_COUNT = 70;

function zeros(rows: number, columns: number): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));
}

function dot(a: number[], b: number[]): number {
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result += a[i] * b[i];
  return result;
}

function invert(input: Matrix): { inverse: Matrix; logDet: number } | null {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const inverse = zeros(n, n);
  for (let i = 0; i < n; i += 1) inverse[i][i] = 1;
  let logDet = 0;
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (!Number.isFinite(a[pivot][column]) || Math.abs(a[pivot][column]) < 1e-10) return null;
    if (pivot !== column) {
      [a[pivot], a[column]] = [a[column], a[pivot]];
      [inverse[pivot], inverse[column]] = [inverse[column], inverse[pivot]];
    }
    const value = a[column][column];
    logDet += Math.log(Math.abs(value));
    for (let j = 0; j < n; j += 1) {
      a[column][j] /= value;
      inverse[column][j] /= value;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = a[row][column];
      if (factor === 0) continue;
      for (let j = 0; j < n; j += 1) {
        a[row][j] -= factor * a[column][j];
        inverse[row][j] -= factor * inverse[column][j];
      }
    }
  }
  return { inverse, logDet };
}

function multiplyMatrixVector(matrix: Matrix, vector: number[]): number[] {
  return matrix.map((row) => dot(row, vector));
}

function designRow(group: number, time: number): number[] {
  const row = Array.from({ length: PARAMETER_COUNT }, () => 0);
  row[0] = 1;
  if (group > 0) row[GROUP_PARAMETER_START + group - 1] = 1;
  if (time > 0) row[TIME_PARAMETER_START + time - 1] = 1;
  if (group > 0 && time > 0) row[INTERACTION_PARAMETER_START + (group - 1) * 6 + (time - 1)] = 1;
  return row;
}

function buildObservations(matrix: string[][]): { observations: Observation[]; invalidBaselineCount: number; missingCount: number } {
  const normalized = normalizeLineMatrix(matrix);
  const observations: Observation[] = [];
  let invalidBaselineCount = 0;
  let missingCount = 0;
  for (let group = 0; group < LINE_GROUPS.length; group += 1) {
    for (let animal = 0; animal < LINE_ANIMALS_PER_GROUP; animal += 1) {
      const row = normalized[group * LINE_ANIMALS_PER_GROUP + animal] ?? [];
      const baselineText = row[0]?.trim() ?? "";
      const baseline = baselineText === "" ? null : Number(baselineText);
      const validBaseline = Number.isFinite(baseline) && baseline !== 0;
      if (baselineText !== "" && baseline !== 0 && !Number.isFinite(baseline)) invalidBaselineCount += 1;
      for (let time = 0; time < LINE_WEEKS.length; time += 1) {
        const raw = row[time]?.trim() ?? "";
        const value = raw === "" ? null : Number(raw);
        if (raw === "" || value === 0 || !Number.isFinite(value) || !validBaseline) {
          missingCount += 1;
          continue;
        }
        const numericValue = value as number;
        observations.push({ group, time, mouse: group * LINE_ANIMALS_PER_GROUP + animal, value: time === 0 ? 0 : ((numericValue - (baseline as number)) / (baseline as number)) * 100 });
      }
    }
  }
  return { observations, invalidBaselineCount, missingCount };
}

function fitAtRho(observations: Observation[], rho: number): Fit | null {
  const n = observations.length;
  const p = PARAMETER_COUNT;
  if (n <= p) return null;
  const design = observations.map((observation) => designRow(observation.group, observation.time));
  const xtwx = zeros(p, p);
  const xtwy = Array.from({ length: p }, () => 0);
  const byMouse = new Map<number, number[]>();
  observations.forEach((observation, index) => {
    const indices = byMouse.get(observation.mouse) ?? [];
    indices.push(index);
    byMouse.set(observation.mouse, indices);
  });
  byMouse.forEach((indices) => {
    const alpha = rho / (1 + indices.length * rho);
    indices.forEach((i) => indices.forEach((j) => {
      const weight = (i === j ? 1 : 0) - alpha;
      const xi = design[i];
      const xj = design[j];
      for (let a = 0; a < p; a += 1) {
        xtwy[a] += xi[a] * weight * observations[j].value;
        for (let b = 0; b < p; b += 1) xtwx[a][b] += xi[a] * weight * xj[b];
      }
    }));
  });
  const inverted = invert(xtwx);
  if (!inverted) return null;
  const beta = multiplyMatrixVector(inverted.inverse, xtwy);
  const residuals = observations.map((observation, index) => observation.value - dot(design[index], beta));
  let q = 0;
  byMouse.forEach((indices) => {
    const alpha = rho / (1 + indices.length * rho);
    const sum = indices.reduce((total, index) => total + residuals[index], 0);
    q += indices.reduce((total, index) => total + residuals[index] ** 2, 0) - alpha * sum ** 2;
  });
  const dfResidual = n - p;
  const residualVariance = Math.max(q / dfResidual, 1e-12);
  return { beta, covariance: inverted.inverse.map((row) => row.map((value) => value * residualVariance)), rho, residualVariance, randomVariance: residualVariance * rho, dfResidual, observations, design };
}

function profileFit(observations: Observation[]): Fit | null {
  const candidates = [0, ...Array.from({ length: 25 }, (_, index) => 10 ** (-3 + index * 0.25))];
  let bestFit: Fit | null = null;
  let bestScore = -Infinity;
  candidates.forEach((rho) => {
    const fit = fitAtRho(observations, rho);
    if (!fit) return;
    const logDetV = fit.observations.reduce((sum, observation, index, all) => {
      const sameMouse = all.filter((candidate) => candidate.mouse === observation.mouse).length;
      return index === all.findIndex((candidate) => candidate.mouse === observation.mouse) ? sum + Math.log(1 + sameMouse * rho) : sum;
    }, 0);
    const inverted = invert(fit.covariance);
    const score = -(fit.dfResidual * Math.log(fit.residualVariance) + logDetV + (inverted?.logDet ?? 0));
    if (bestFit == null || score > bestScore) {
      bestFit = fit;
      bestScore = score;
    }
  });
  return bestFit;
}

function logGamma(value: number): number {
  const coefficients = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let x = value;
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  coefficients.forEach((coefficient) => { y += 1; ser += coefficient / y; });
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-7;
  const fpMin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betaContinuedFraction(a, b, x) / a;
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

function pFromT(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  const x = df / (df + t * t);
  return Math.min(1, Math.max(0, regularizedBeta(x, df / 2, 0.5)));
}

function pFromF(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0) return 1;
  return Math.min(1, Math.max(0, regularizedBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)));
}

function submatrix(matrix: Matrix, indexes: number[]): Matrix {
  return indexes.map((row) => indexes.map((column) => matrix[row][column]));
}

function contrast(fit: Fit, rowA: number[], rowB: number[]): { estimate: number; se: number; statistic: number; pValue: number } {
  const vector = rowA.map((value, index) => value - rowB[index]);
  const estimate = dot(vector, fit.beta);
  const variance = dot(vector, multiplyMatrixVector(fit.covariance, vector));
  const se = Math.sqrt(Math.max(variance, 1e-12));
  const statistic = estimate / se;
  return { estimate, se, statistic, pValue: pFromT(Math.abs(statistic), fit.dfResidual) };
}

function holm(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const adjusted = Array.from({ length: values.length }, () => 1);
  let running = 0;
  order.forEach((item, rank) => {
    running = Math.max(running, Math.min(1, (values.length - rank) * item.value));
    adjusted[item.index] = running;
  });
  return adjusted;
}

function generateLetters(comparisons: LmmComparison[]): string[] {
  const letters: string[][] = LINE_GROUPS.map(() => []);
  const week7 = comparisons.filter((comparison) => comparison.time === "Week 7");
  const nonsignificant = (a: number, b: number) => {
    const match = week7.find((comparison) => (comparison.groupA === LINE_GROUPS[a] && comparison.groupB === LINE_GROUPS[b]) || (comparison.groupA === LINE_GROUPS[b] && comparison.groupB === LINE_GROUPS[a]));
    return match ? match.adjustedP >= 0.05 : false;
  };
  let nextLetter = 0;
  LINE_GROUPS.forEach((_, group) => {
    for (let letter = 0; letter < nextLetter; letter += 1) {
      const members = letters.map((list, index) => list.includes(String.fromCharCode(97 + letter)) ? index : -1).filter((index) => index >= 0);
      if (members.every((member) => nonsignificant(group, member))) {
        letters[group].push(String.fromCharCode(97 + letter));
        return;
      }
    }
    letters[group].push(String.fromCharCode(97 + nextLetter));
    nextLetter += 1;
  });
  return letters.map((list) => list.join(""));
}

export function analyzeWeightChangeLmm(matrix: string[][]): WeightChangeLmmResult {
  const { observations, invalidBaselineCount, missingCount } = buildObservations(matrix);
  const expected = LINE_GROUPS.length * LINE_ANIMALS_PER_GROUP * LINE_WEEKS.length;
  if (observations.length < PARAMETER_COUNT + 2) return { ok: false, message: "有效变化率数据不足，无法拟合 Group × Time 混合效应模型。", n: observations.length, mouseCount: new Set(observations.map((observation) => observation.mouse)).size, missingCount, missingRate: missingCount / expected, invalidBaselineCount, rho: 0, residualVariance: 0, randomVariance: 0, dfResidual: 0, effects: [], groupComparisons: [], baselineComparisons: [], week7Letters: [], warnings: [] };
  const fit = profileFit(observations);
  if (!fit) return { ok: false, message: "模型矩阵秩不足或无法稳定求逆，未生成统计结果。", n: observations.length, mouseCount: new Set(observations.map((observation) => observation.mouse)).size, missingCount, missingRate: missingCount / expected, invalidBaselineCount, rho: 0, residualVariance: 0, randomVariance: 0, dfResidual: 0, effects: [], groupComparisons: [], baselineComparisons: [], week7Letters: [], warnings: ["请检查是否有完整的组别和时间点数据。"] };
  const effects = [
    { effect: "Group", indexes: Array.from({ length: 9 }, (_, index) => GROUP_PARAMETER_START + index) },
    { effect: "Time", indexes: Array.from({ length: 6 }, (_, index) => TIME_PARAMETER_START + index) },
    { effect: "Group × Time", indexes: Array.from({ length: 54 }, (_, index) => INTERACTION_PARAMETER_START + index) },
  ].map(({ effect, indexes }) => {
    const covariance = submatrix(fit.covariance, indexes);
    const inverse = invert(covariance);
    const beta = indexes.map((index) => fit.beta[index]);
    const statistic = inverse ? dot(beta, multiplyMatrixVector(inverse.inverse, beta)) / indexes.length : Number.NaN;
    return { effect, df1: indexes.length, df2: fit.dfResidual, statistic, pValue: pFromF(statistic, indexes.length, fit.dfResidual) };
  });
  const groupComparisons: LmmComparison[] = [];
  for (let time = 0; time < LINE_WEEKS.length; time += 1) {
    const rows = LINE_GROUPS.map((_, group) => designRow(group, time));
    const raw: LmmComparison[] = [];
    for (let a = 0; a < LINE_GROUPS.length; a += 1) for (let b = a + 1; b < LINE_GROUPS.length; b += 1) {
      const result = contrast(fit, rows[a], rows[b]);
      raw.push({ groupA: LINE_GROUPS[a], groupB: LINE_GROUPS[b], time: LINE_WEEKS[time], ...result, adjustedP: result.pValue });
    }
    raw.forEach((comparison) => groupComparisons.push({
      ...comparison,
      // Tukey 的 q = |t| × √2；同一时间点的 10 组比较作为一个 family。
      adjustedP: tukeyPValue(Math.abs(comparison.statistic) * Math.sqrt(2), LINE_GROUPS.length, fit.dfResidual),
    }));
  }
  const baselineComparisons: LmmTimeComparison[] = [];
  for (let group = 0; group < LINE_GROUPS.length; group += 1) {
    const raw: LmmTimeComparison[] = [];
    const baseline = designRow(group, 0);
    for (let time = 1; time < LINE_WEEKS.length; time += 1) {
      const result = contrast(fit, designRow(group, time), baseline);
      raw.push({ group: LINE_GROUPS[group], time: LINE_WEEKS[time], ...result, adjustedP: result.pValue });
    }
    const adjusted = holm(raw.map((comparison) => comparison.pValue));
    raw.forEach((comparison, index) => baselineComparisons.push({ ...comparison, adjustedP: adjusted[index] }));
  }
  const warnings: string[] = [];
  if (invalidBaselineCount) warnings.push(`${invalidBaselineCount} 只动物的 Week 1 基线为空或为 0，未纳入变化率模型。`);
  if (missingCount) warnings.push(`缺失/零值占预期数据格的 ${(missingCount / expected * 100).toFixed(1)}%，模型使用其余有效观测。`);
  return { ok: true, message: "模型已完成拟合。", n: observations.length, mouseCount: new Set(observations.map((observation) => observation.mouse)).size, missingCount, missingRate: missingCount / expected, invalidBaselineCount, rho: fit.rho, residualVariance: fit.residualVariance, randomVariance: fit.randomVariance, dfResidual: fit.dfResidual, effects, groupComparisons, baselineComparisons, week7Letters: generateLetters(groupComparisons), warnings };
}

export function lmmResultToCsv(result: WeightChangeLmmResult): string {
  const rows: string[][] = [["section", "effect_or_group", "comparison_or_df2", "time", "estimate_or_F", "SE_or_df1", "p_value", "adjusted_p"]];
  result.effects.forEach((effect) => rows.push(["fixed_effect", effect.effect, String(effect.df2), "", effect.statistic.toString(), effect.df1.toString(), effect.pValue.toString(), ""]));
  result.groupComparisons.forEach((comparison) => rows.push(["group_pairwise_tukey", `${comparison.groupA} vs ${comparison.groupB}`, "", comparison.time, comparison.estimate.toString(), comparison.se.toString(), comparison.pValue.toString(), comparison.adjustedP.toString()]));
  result.baselineComparisons.forEach((comparison) => rows.push(["within_group_baseline_holm", comparison.group, "", comparison.time, comparison.estimate.toString(), comparison.se.toString(), comparison.pValue.toString(), comparison.adjustedP.toString()]));
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, "\"\"")}"`).join(",")).join("\n");
}
