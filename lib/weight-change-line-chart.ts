export const LINE_GROUPS = [
  "Sham",
  "OVX",
  "E2",
  "UO",
  "IFO-H",
  "IFO-L",
  "VFO-H",
  "VFO-L",
  "WM48-H",
  "WM48-L",
] as const;

export const LINE_WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"] as const;
export const LINE_ANIMALS_PER_GROUP = 7;
export const LINE_ROWS = LINE_GROUPS.length * LINE_ANIMALS_PER_GROUP;

export const LINE_GROUPS_COLORS = [
  "#D8D8D8",
  "#D2B3B3",
  "#91ACCC",
  "#D5D2A8",
  "#CADBED",
  "#B4C9DE",
  "#C9C6E6",
  "#B5B1D9",
  "#BDE2D5",
  "#A9D5C6",
] as const;

export const LINE_MARKERS = [
  "circle",
  "square",
  "triangle-up",
  "diamond",
  "triangle-down",
  "open-circle",
  "star",
  "cross",
  "hexagon",
  "open-square",
] as const;

export type LineMarker = (typeof LINE_MARKERS)[number];
export type LineErrorMode = "sem" | "sd";

export interface LinePoint {
  mean: number | null;
  sd: number | null;
  sem: number | null;
  n: number;
}

export interface LineChartStats {
  groups: LinePoint[][];
  invalidBaselines: string[];
  invalidValues: string[];
  min: number;
  max: number;
  ticks: number[];
}

export function emptyLineMatrix(): string[][] {
  return Array.from({ length: LINE_ROWS }, () => LINE_WEEKS.map(() => ""));
}

export function normalizeLineMatrix(value: unknown): string[][] {
  const matrix = emptyLineMatrix();
  if (!Array.isArray(value)) return matrix;
  for (let row = 0; row < LINE_ROWS; row += 1) {
    const source = Array.isArray(value[row]) ? value[row] : [];
    for (let col = 0; col < LINE_WEEKS.length; col += 1) {
      const cell = source[col];
      matrix[row][col] = typeof cell === "string" || typeof cell === "number" ? String(cell) : "";
    }
  }
  return matrix;
}

export function parseLinePaste(text: string): { matrix: string[][]; rowCount: number; columnCount: number; warnings: string[] } {
  const matrix = emptyLineMatrix();
  const warnings: string[] = [];
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  if (!normalized) return { matrix, rowCount: 0, columnCount: 0, warnings: ["没有检测到数据。"] };

  let rows = normalized.split("\n").map((row) => row.split("\t"));
  const hasTabs = rows.some((row) => row.length > 1);
  if (!hasTabs && rows.length === LINE_ROWS * LINE_WEEKS.length) {
    rows = Array.from({ length: LINE_ROWS }, (_, row) => rows.slice(row * LINE_WEEKS.length, (row + 1) * LINE_WEEKS.length).map((cell) => cell[0] ?? ""));
  }

  const rowCount = rows.length;
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (rowCount !== LINE_ROWS) warnings.push(`检测到 ${rowCount} 行，预期 ${LINE_ROWS} 行。`);
  if (columnCount !== LINE_WEEKS.length) warnings.push(`检测到最多 ${columnCount} 列，预期 ${LINE_WEEKS.length} 列。`);
  if (rowCount > LINE_ROWS || columnCount > LINE_WEEKS.length) warnings.push("多出的内容不会被自动写入，请先修正粘贴区域。");

  for (let row = 0; row < Math.min(rowCount, LINE_ROWS); row += 1) {
    for (let col = 0; col < Math.min(rows[row].length, LINE_WEEKS.length); col += 1) {
      const cell = rows[row][col] ?? "";
      matrix[row][col] = cell.trim();
      if (matrix[row][col] !== "" && !Number.isFinite(Number(matrix[row][col]))) {
        warnings.push(`第 ${row + 1} 行、第 ${col + 1} 列不是有效数字。`);
      }
    }
  }
  return { matrix, rowCount, columnCount, warnings };
}

export function lineMatrixToTsv(matrix: string[][]): string {
  return normalizeLineMatrix(matrix).map((row) => row.map((cell) => cell.trim()).join("\t")).join("\n");
}

function parseNumber(cell: string | undefined): number | null {
  const text = (cell ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function meanAndError(values: number[]): LinePoint {
  if (!values.length) return { mean: null, sd: null, sem: null, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (values.length < 2) return { mean, sd: null, sem: null, n: values.length };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  return { mean, sd, sem: sd / Math.sqrt(values.length), n: values.length };
}

function niceStep(range: number): number {
  const rough = range / 4;
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-9)));
  const normalized = rough / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

export function calculateLineStats(matrix: string[][]): LineChartStats {
  const normalized = normalizeLineMatrix(matrix);
  const groups: LinePoint[][] = [];
  const invalidBaselines: string[] = [];
  const invalidValues: string[] = [];

  for (let group = 0; group < LINE_GROUPS.length; group += 1) {
    const changes: (number | null)[][] = [];
    for (let animal = 0; animal < LINE_ANIMALS_PER_GROUP; animal += 1) {
      const rowIndex = group * LINE_ANIMALS_PER_GROUP + animal;
      const baseline = parseNumber(normalized[rowIndex]?.[0]);
      if (baseline == null || baseline === 0) invalidBaselines.push(`${LINE_GROUPS[group]} animal ${animal + 1}`);
      const animalChanges = LINE_WEEKS.map((_, week) => {
        const value = parseNumber(normalized[rowIndex]?.[week]);
        if (baseline == null || baseline === 0) return null;
        if (value == null) return null;
        return week === 0 ? 0 : ((value - baseline) / baseline) * 100;
      });
      for (let week = 0; week < LINE_WEEKS.length; week += 1) {
        const raw = normalized[rowIndex]?.[week]?.trim() ?? "";
        if (raw && parseNumber(raw) == null) invalidValues.push(`${LINE_GROUPS[group]} animal ${animal + 1}, ${LINE_WEEKS[week]}`);
      }
      changes.push(animalChanges);
    }
    groups.push(LINE_WEEKS.map((_, week) => meanAndError(changes.map((row) => row[week]).filter((value): value is number => value != null))));
  }

  const extents: number[] = [0];
  groups.forEach((group) => group.forEach((point) => {
    if (point.mean == null) return;
    const error = point.sd ?? 0;
    extents.push(point.mean - error, point.mean + error);
  }));
  const rawMin = Math.min(...extents);
  const rawMax = Math.max(...extents);
  const step = niceStep(rawMax - rawMin || 1);
  const min = Math.min(0, Math.floor(rawMin / step) * step - step * 0.1);
  const max = Math.max(0, Math.ceil(rawMax / step) * step + step * 0.1);
  const tickStep = niceStep(max - min || 1);
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / tickStep) * tickStep; tick <= max + tickStep * 0.01; tick += tickStep) ticks.push(Number(tick.toFixed(8)));
  if (!ticks.some((tick) => Math.abs(tick) < 1e-8)) ticks.push(0);
  ticks.sort((a, b) => a - b);
  return { groups, invalidBaselines: [...new Set(invalidBaselines)], invalidValues: [...new Set(invalidValues)], min, max, ticks };
}

export function selectedError(point: LinePoint, mode: LineErrorMode): number {
  return mode === "sd" ? (point.sd ?? 0) : (point.sem ?? 0);
}

export const LINE_SVG_WIDTH = 1120;
export const LINE_SVG_HEIGHT = 640;
export const LINE_PLOT = { left: 90, right: 300, top: 70, bottom: 100 } as const;

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function markerSvg(marker: LineMarker, x: number, y: number, color: string, size = 5): string {
  const open = marker === "open-circle" || marker === "open-square";
  const fill = open ? "white" : color;
  const stroke = color;
  if (marker === "circle" || marker === "open-circle") return `<circle cx="${x}" cy="${y}" r="${size}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  if (marker === "square" || marker === "open-square") return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  if (marker === "diamond") return `<path d="M ${x} ${y - size - 1} L ${x + size + 1} ${y} L ${x} ${y + size + 1} L ${x - size - 1} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  if (marker === "triangle-up" || marker === "triangle-down") {
    const sign = marker === "triangle-up" ? -1 : 1;
    return `<path d="M ${x} ${y + sign * (size + 1)} L ${x + size + 1} ${y - sign * size} L ${x - size - 1} ${y - sign * size} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  }
  if (marker === "cross") return `<path d="M ${x - size} ${y - size} L ${x + size} ${y + size} M ${x + size} ${y - size} L ${x - size} ${y + size}" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>`;
  if (marker === "hexagon") {
    const points = Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI / 3) * index - Math.PI / 6;
      return `${x + Math.cos(angle) * size},${y + Math.sin(angle) * size}`;
    }).join(" ");
    return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  }
  if (marker === "star") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = (Math.PI / 5) * index - Math.PI / 2;
      const radius = index % 2 === 0 ? size + 1 : size * 0.45;
      return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
    }).join(" ");
    return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`;
  }
  return "";
}

export function buildLineChartSvg(stats: LineChartStats, letters: string[], mode: LineErrorMode): string {
  const plotW = LINE_SVG_WIDTH - LINE_PLOT.left - LINE_PLOT.right;
  const plotH = LINE_SVG_HEIGHT - LINE_PLOT.top - LINE_PLOT.bottom;
  const xOf = (week: number) => LINE_PLOT.left + (week / (LINE_WEEKS.length - 1)) * plotW;
  const yOf = (value: number) => LINE_PLOT.top + (1 - (value - stats.min) / (stats.max - stats.min || 1)) * plotH;
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_SVG_WIDTH}" height="${LINE_SVG_HEIGHT}" viewBox="0 0 ${LINE_SVG_WIDTH} ${LINE_SVG_HEIGHT}"><rect width="100%" height="100%" fill="white"/>`];
  parts.push(`<text x="24" y="42" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#222">B</text>`);
  stats.ticks.forEach((tick) => {
    const y = yOf(tick);
    parts.push(`<line x1="${LINE_PLOT.left}" y1="${y}" x2="${LINE_SVG_WIDTH - LINE_PLOT.right}" y2="${y}" stroke="#E3E5E8" stroke-width="1"/>`);
    parts.push(`<text x="${LINE_PLOT.left - 12}" y="${y + 4}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#333">${tick.toFixed(0)}</text>`);
  });
  const zeroY = yOf(0);
  parts.push(`<line x1="${LINE_PLOT.left}" y1="${zeroY}" x2="${LINE_SVG_WIDTH - LINE_PLOT.right}" y2="${zeroY}" stroke="#7E858C" stroke-width="1.2" stroke-dasharray="5 4"/>`);
  parts.push(`<line x1="${LINE_PLOT.left}" y1="${LINE_PLOT.top}" x2="${LINE_PLOT.left}" y2="${LINE_PLOT.top + plotH}" stroke="#222" stroke-width="1.2"/>`);
  parts.push(`<line x1="${LINE_PLOT.left}" y1="${LINE_PLOT.top + plotH}" x2="${LINE_SVG_WIDTH - LINE_PLOT.right}" y2="${LINE_PLOT.top + plotH}" stroke="#222" stroke-width="1.2"/>`);
  const surgeryX = xOf(1);
  parts.push(`<line x1="${surgeryX}" y1="${LINE_PLOT.top}" x2="${surgeryX}" y2="${LINE_PLOT.top + plotH}" stroke="#8A8F94" stroke-width="1.3" stroke-dasharray="6 5"/>`);
  parts.push(`<text x="${surgeryX + 8}" y="${LINE_PLOT.top + 18}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#555">OVX surgery</text>`);
  LINE_WEEKS.forEach((week, index) => {
    const x = xOf(index);
    parts.push(`<line x1="${x}" y1="${LINE_PLOT.top + plotH}" x2="${x}" y2="${LINE_PLOT.top + plotH + 5}" stroke="#222" stroke-width="1"/>`);
    parts.push(`<text x="${x}" y="${LINE_PLOT.top + plotH + 24}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#222">${week}</text>`);
  });
  parts.push(`<text x="${LINE_PLOT.left + plotW / 2}" y="${LINE_SVG_HEIGHT - 26}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#222">Gavage duration (weeks)</text>`);
  parts.push(`<text x="22" y="${LINE_PLOT.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 22 ${LINE_PLOT.top + plotH / 2})" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#222">Body weight change (%)</text>`);
  stats.groups.forEach((group, groupIndex) => {
    const color = LINE_GROUPS_COLORS[groupIndex];
    const marker = LINE_MARKERS[groupIndex];
    const pathSegments: string[] = [];
    let segment = "";
    group.forEach((point, week) => {
      if (point.mean == null) {
        if (segment) pathSegments.push(segment);
        segment = "";
        return;
      }
      const command = segment ? "L" : "M";
      segment += `${command} ${xOf(week)} ${yOf(point.mean)} `;
    });
    if (segment) pathSegments.push(segment);
    pathSegments.forEach((path) => parts.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`));
    group.forEach((point, week) => {
      if (point.mean == null) return;
      const x = xOf(week);
      const y = yOf(point.mean);
      const error = selectedError(point, mode);
      if (error > 0) {
        parts.push(`<line x1="${x}" y1="${yOf(point.mean + error)}" x2="${x}" y2="${yOf(point.mean - error)}" stroke="${color}" stroke-width="1.4"/>`);
        parts.push(`<line x1="${x - 4}" y1="${yOf(point.mean + error)}" x2="${x + 4}" y2="${yOf(point.mean + error)}" stroke="${color}" stroke-width="1.4"/>`);
        parts.push(`<line x1="${x - 4}" y1="${yOf(point.mean - error)}" x2="${x + 4}" y2="${yOf(point.mean - error)}" stroke="${color}" stroke-width="1.4"/>`);
      }
      parts.push(markerSvg(marker, x, y, color));
      if (week === LINE_WEEKS.length - 1 && letters[groupIndex]?.trim()) parts.push(`<text x="${x + 10}" y="${y - Math.max(8, error + 8)}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#333">${escapeXml(letters[groupIndex].trim())}</text>`);
    });
  });
  const legendX = LINE_SVG_WIDTH - LINE_PLOT.right + 35;
  parts.push(`<text x="${legendX}" y="${LINE_PLOT.top - 20}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#222">Groups</text>`);
  LINE_GROUPS.forEach((group, index) => {
    const y = LINE_PLOT.top + index * 34;
    const color = LINE_GROUPS_COLORS[index];
    parts.push(`<line x1="${legendX}" y1="${y}" x2="${legendX + 30}" y2="${y}" stroke="${color}" stroke-width="2"/>`);
    parts.push(markerSvg(LINE_MARKERS[index], legendX + 15, y, color, 4));
    parts.push(`<text x="${legendX + 42}" y="${y + 4}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#222">${group}</text>`);
  });
  parts.push("</svg>");
  return parts.join("");
}

function pdfColor(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`;
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildLineChartPdf(stats: LineChartStats, letters: string[], mode: LineErrorMode): string {
  const pageW = 792;
  const pageH = 540;
  const sx = pageW / LINE_SVG_WIDTH;
  const sy = pageH / LINE_SVG_HEIGHT;
  const plotW = LINE_SVG_WIDTH - LINE_PLOT.left - LINE_PLOT.right;
  const plotH = LINE_SVG_HEIGHT - LINE_PLOT.top - LINE_PLOT.bottom;
  const xOf = (week: number) => LINE_PLOT.left + (week / (LINE_WEEKS.length - 1)) * plotW;
  const yOf = (value: number) => LINE_PLOT.top + (1 - (value - stats.min) / (stats.max - stats.min || 1)) * plotH;
  const X = (x: number) => x * sx;
  const Y = (y: number) => pageH - y * sy;
  const commands: string[] = ["q", "1 1 1 rg", `0 0 ${pageW} ${pageH} re f`, "Q"];
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 1, dashed = false) => {
    commands.push(`${pdfColor(color)} RG ${width * sx} w ${dashed ? "[4 3] 0 d" : "[] 0 d"} ${X(x1).toFixed(2)} ${Y(y1).toFixed(2)} m ${X(x2).toFixed(2)} ${Y(y2).toFixed(2)} l S`);
  };
  const text = (x: number, y: number, value: string, size = 10, color = "#222222", align: "left" | "center" = "left") => {
    const scaledSize = size * sy;
    const offset = align === "center" ? value.length * scaledSize * 0.25 : 0;
    commands.push(`${pdfColor(color)} rg BT /F1 ${scaledSize.toFixed(2)} Tf 1 0 0 1 ${(X(x) - offset).toFixed(2)} ${Y(y).toFixed(2)} Tm (${pdfEscape(value)}) Tj ET`);
  };
  stats.ticks.forEach((tick) => {
    const y = yOf(tick);
    line(LINE_PLOT.left, y, LINE_SVG_WIDTH - LINE_PLOT.right, y, "#E3E5E8");
    text(LINE_PLOT.left - 12, y + 4, tick.toFixed(0), 12, "#333333", "center");
  });
  line(LINE_PLOT.left, yOf(0), LINE_SVG_WIDTH - LINE_PLOT.right, yOf(0), "#7E858C", 1, true);
  line(LINE_PLOT.left, LINE_PLOT.top, LINE_PLOT.left, LINE_PLOT.top + plotH, "#222222", 1.2);
  line(LINE_PLOT.left, LINE_PLOT.top + plotH, LINE_SVG_WIDTH - LINE_PLOT.right, LINE_PLOT.top + plotH, "#222222", 1.2);
  const surgeryX = xOf(1);
  line(surgeryX, LINE_PLOT.top, surgeryX, LINE_PLOT.top + plotH, "#8A8F94", 1.3, true);
  text(surgeryX + 8, LINE_PLOT.top + 18, "OVX surgery", 12, "#555555");
  LINE_WEEKS.forEach((week, index) => {
    const x = xOf(index);
    line(x, LINE_PLOT.top + plotH, x, LINE_PLOT.top + plotH + 5, "#222222");
    text(x, LINE_PLOT.top + plotH + 24, week, 12, "#222222", "center");
  });
  text(24, 42, "B", 30);
  text(LINE_PLOT.left + plotW / 2, LINE_SVG_HEIGHT - 26, "Gavage duration (weeks)", 14, "#222222", "center");
  text(25, LINE_PLOT.top + plotH / 2, "Body weight change (%)", 14, "#222222");
  const drawMarker = (marker: LineMarker, x: number, y: number, color: string, size = 5) => {
    const px = X(x);
    const py = Y(y);
    const s = size * sx;
    const stroke = pdfColor(color);
    const fill = marker === "open-circle" || marker === "open-square" ? "1 1 1" : stroke;
    if (marker === "circle" || marker === "open-circle") {
      const c = s * 0.5522848;
      commands.push(`${fill} rg ${stroke} RG 1 w ${px + s} ${py} m ${px + s} ${py + c} ${px + c} ${py + s} ${px} ${py + s} c ${px - c} ${py + s} ${px - s} ${py + c} ${px - s} ${py} c ${px - s} ${py - c} ${px - c} ${py - s} ${px} ${py - s} c ${px + c} ${py - s} ${px + s} ${py - c} ${px + s} ${py} c h ${marker === "open-circle" ? "S" : "B"}`);
    }
    else if (marker === "square" || marker === "open-square") commands.push(`${fill} rg ${stroke} RG ${px - s} ${py - s} ${s * 2} ${s * 2} re ${marker === "open-square" ? "S" : "B"}`);
    else if (marker === "cross") {
      line(x - size, y - size, x + size, y + size, color, 1.5);
      line(x + size, y - size, x - size, y + size, color, 1.5);
    } else if (marker === "diamond" || marker === "triangle-up" || marker === "triangle-down" || marker === "hexagon" || marker === "star") {
      const sides = marker === "hexagon" ? 6 : marker === "star" ? 10 : marker === "diamond" ? 4 : 3;
      const points = Array.from({ length: sides }, (_, index) => {
        const angle = marker === "triangle-up" ? (Math.PI * 2 * index) / 3 - Math.PI / 2 : marker === "triangle-down" ? (Math.PI * 2 * index) / 3 + Math.PI / 2 : (Math.PI * 2 * index) / sides - Math.PI / 2;
        const radius = marker === "star" && index % 2 ? size * 0.45 : size;
        return [X(x + Math.cos(angle) * radius), Y(y + Math.sin(angle) * radius)] as const;
      });
      commands.push(`${fill} rg ${stroke} RG 1 w ${points.map(([px2, py2], index) => `${px2.toFixed(2)} ${py2.toFixed(2)} ${index ? "l" : "m"}`).join(" ")} h B`);
    }
  };
  stats.groups.forEach((group, groupIndex) => {
    const color = LINE_GROUPS_COLORS[groupIndex];
    let previous: { x: number; y: number } | null = null;
    group.forEach((point, week) => {
      if (point.mean == null) {
        previous = null;
        return;
      }
      const x = xOf(week);
      const y = yOf(point.mean);
      if (previous) line(previous.x, previous.y, x, y, color, 2);
      previous = { x, y };
      const error = selectedError(point, mode);
      if (error > 0) {
        line(x, yOf(point.mean + error), x, yOf(point.mean - error), color, 1.4);
        line(x - 4, yOf(point.mean + error), x + 4, yOf(point.mean + error), color, 1.4);
        line(x - 4, yOf(point.mean - error), x + 4, yOf(point.mean - error), color, 1.4);
      }
      drawMarker(LINE_MARKERS[groupIndex], x, y, color);
      if (week === LINE_WEEKS.length - 1 && letters[groupIndex]?.trim()) text(x + 10, y - Math.max(8, error + 8), letters[groupIndex].trim(), 13, "#333333");
    });
  });
  const legendX = LINE_SVG_WIDTH - LINE_PLOT.right + 35;
  text(legendX, LINE_PLOT.top - 20, "Groups", 13);
  LINE_GROUPS.forEach((group, index) => {
    const y = LINE_PLOT.top + index * 34;
    line(legendX, y, legendX + 30, y, LINE_GROUPS_COLORS[index], 2);
    drawMarker(LINE_MARKERS[index], legendX + 15, y, LINE_GROUPS_COLORS[index], 4);
    text(legendX + 42, y + 4, group, 12);
  });
  commands.push("q", "Q");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
