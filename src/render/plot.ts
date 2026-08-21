import type { FreeModel } from "../api/schemas.js";
import { colorizeText } from "../core/creator-colors.js";
import { computeOutstanding } from "../core/plot-highlights.js";
import { median, modelValue } from "../core/metrics.js";

const BRAILLE_BASE = 0x2800;
const CORNER_GAP = 2;
const LEGEND_X_WIDTH = 7;
const LEGEND_Y_WIDTH = 6;

export interface PlotPoint {
  label: string;
  x: number;
  y: number;
  creator?: string;
}

export type YField = "intelligence" | "coding" | "agentic" | "speed";
export type SortField = "value" | YField;

export interface QuadrantPlotOptions {
  width?: number;
  height?: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  logX?: boolean;
  ascii?: boolean;
  legendWidth?: number;
  cornerLabels?: readonly [string, string, string, string];
  xFormat?: (value: number) => string;
  yFormat?: (value: number) => string;
  colorize?: boolean;
  outstanding?: ReadonlySet<string>;
}

interface ResolvedOptions {
  width: number;
  height: number;
  title: string;
  xLabel: string;
  yLabel: string;
  logX: boolean;
  ascii: boolean;
  legendWidth: number;
  cornerLabels: readonly [string, string, string, string];
  xFormat: (value: number) => string;
  yFormat: (value: number) => string;
  colorize: boolean;
  outstanding: ReadonlySet<string>;
}

const DEFAULT_CORNER_LABELS: readonly [string, string, string, string] = [
  "cheap + strong",
  "pricey + strong",
  "cheap + weak",
  "pricey + weak",
];

interface CellState {
  dots: number;
  vline: boolean;
  hline: boolean;
  letter: string | null;
  creator: string | null;
  label: string | null;
}

interface CanvasState {
  cells: CellState[][];
  widthDots: number;
  heightDots: number;
  braille: boolean;
}

interface Layout {
  canvas: CanvasState;
  xToDot: (x: number) => number;
  yToDotTop: (y: number) => number;
  medianXDot: number | null;
  medianYDotTop: number | null;
}

export interface QuadrantStats {
  medianX: number | null;
  medianY: number | null;
}

interface PlacedMarker {
  letter: string;
  point: PlotPoint;
  row: number;
  col: number;
  creator: string | null;
}

interface TickRow {
  row: number;
  label: string;
}

interface TickCol {
  col: number;
  label: string;
}

export interface QuadrantRenderResult {
  text: string;
  stats: QuadrantStats;
  placed: PlacedMarker[];
  plotted: number;
}

function resolveOptions(options: QuadrantPlotOptions): ResolvedOptions {
  return {
    width: options.width ?? 60,
    height: options.height ?? 24,
    title: options.title ?? "",
    xLabel: options.xLabel ?? "x",
    yLabel: options.yLabel ?? "y",
    logX: options.logX ?? true,
    ascii: options.ascii ?? false,
    legendWidth: options.legendWidth ?? 31,
    cornerLabels: options.cornerLabels ?? DEFAULT_CORNER_LABELS,
    xFormat: options.xFormat ?? ((value) => `$${compactNumber(value)}`),
    yFormat: options.yFormat ?? compactNumber,
    colorize: options.colorize ?? false,
    outstanding: options.outstanding ?? new Set(),
  };
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return `${trimTrailingZeros((value / 1000).toFixed(1))}k`;
  return trimTrailingZeros(value.toFixed(2));
}

function trimTrailingZeros(text: string): string {
  const trimmed = text.replace(/\.?0+$/, "");
  return trimmed === "-0" ? "0" : trimmed;
}

function dotBit(dx: number, dy: number): number {
  const bits: readonly (readonly number[])[] = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
  ];
  return bits[dy]?.[dx] ?? 0;
}

function linearScale(value: number, min: number, max: number, size: number): number {
  if (max <= min) return size / 2;
  return ((value - min) / (max - min)) * (size - 1);
}

function clampDot(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value)));
}

function paddedDomain(values: number[], fraction: number): { min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) {
    const pad = Math.abs(max) * fraction + 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = span * fraction;
  return { min: min - pad, max: max + pad };
}

function validPoints(points: PlotPoint[], options: ResolvedOptions): PlotPoint[] {
  return points.filter(
    (point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y) && (!options.logX || point.x > 0),
  );
}

function blankCanvas(options: ResolvedOptions): CanvasState {
  const braille = !options.ascii;
  const widthDots = braille ? options.width * 2 : options.width;
  const heightDots = braille ? options.height * 4 : options.height;
  const cells: CellState[][] = [];
  for (let row = 0; row < options.height; row++) {
    const line: CellState[] = [];
    for (let col = 0; col < options.width; col++) {
      line.push({ dots: 0, vline: false, hline: false, letter: null, creator: null, label: null });
    }
    cells.push(line);
  }
  return { cells, widthDots, heightDots, braille };
}

function buildLayout(points: PlotPoint[], options: ResolvedOptions): Layout {
  const canvas = blankCanvas(options);
  let xToDot: (x: number) => number;
  if (options.logX) {
    const logs = points.map((point) => Math.log10(point.x));
    const domain = paddedDomain(logs, 0.04);
    xToDot = (x) => linearScale(Math.log10(x), domain.min, domain.max, canvas.widthDots);
  } else {
    const domain = paddedDomain(
      points.map((point) => point.x),
      0.04,
    );
    xToDot = (x) => linearScale(x, domain.min, domain.max, canvas.widthDots);
  }
  const yDomain = paddedDomain(
    points.map((point) => point.y),
    0.05,
  );
  const yToDotTop = (y: number) =>
    canvas.heightDots - 1 - linearScale(y, yDomain.min, yDomain.max, canvas.heightDots);
  const medianX = median(points.map((point) => point.x));
  const medianY = median(points.map((point) => point.y));
  const medianXDot = medianX === null ? null : clampDot(xToDot(medianX), canvas.widthDots - 1);
  const medianYDotTop =
    medianY === null ? null : clampDot(yToDotTop(medianY), canvas.heightDots - 1);
  return { canvas, xToDot, yToDotTop, medianXDot, medianYDotTop };
}

function drawMedianLines(canvas: CanvasState, medianXDot: number | null, medianYDotTop: number | null): void {
  if (medianXDot !== null) {
    for (const row of canvas.cells) {
      if (canvas.braille) {
        const col = Math.floor(medianXDot / 2);
        const cell = row[col];
        if (cell) {
          cell.dots |= medianXDot % 2 === 0 ? 0x01 | 0x02 | 0x04 | 0x40 : 0x08 | 0x10 | 0x20 | 0x80;
        }
      } else {
        const cell = row[medianXDot];
        if (cell) cell.vline = true;
      }
    }
  }
  if (medianYDotTop !== null) {
    const rowIndex = canvas.braille ? Math.floor(medianYDotTop / 4) : medianYDotTop;
    const row = canvas.cells[rowIndex];
    if (!row) return;
    if (canvas.braille) {
      const bits = dotBit(0, medianYDotTop % 4) | dotBit(1, medianYDotTop % 4);
      for (const cell of row) cell.dots |= bits;
    } else {
      for (const cell of row) cell.hline = true;
    }
  }
}

function markerLetters(count: number): string[] {
  const letters: string[] = [];
  for (let index = 0; index < count; index++) {
    if (index < 26) letters.push(String.fromCharCode(65 + index));
    else if (index < 52) letters.push(String.fromCharCode(97 + index - 26));
    else letters.push(String(index - 51));
  }
  return letters;
}

const JITTER_OFFSETS: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

function placeMarkers(canvas: CanvasState, layout: Layout, points: PlotPoint[]): PlacedMarker[] {
  const placed: PlacedMarker[] = [];
  const letters = markerLetters(points.length);
  points.forEach((point, index) => {
    const xDot = clampDot(layout.xToDot(point.x), canvas.widthDots - 1);
    const yDotTop = clampDot(layout.yToDotTop(point.y), canvas.heightDots - 1);
    if (canvas.braille) {
      const cell = canvas.cells[Math.floor(yDotTop / 4)]?.[Math.floor(xDot / 2)];
      if (cell) cell.dots |= dotBit(xDot % 2, yDotTop % 4);
    } else {
      const cell = canvas.cells[yDotTop]?.[xDot];
      if (cell) cell.dots = 1;
    }
    const baseCol = canvas.braille ? Math.floor(xDot / 2) : xDot;
    const baseRow = canvas.braille ? Math.floor(yDotTop / 4) : yDotTop;
    const letter = letters[index] ?? "?";
    for (const [dCol, dRow] of JITTER_OFFSETS) {
      const col = baseCol + dCol;
      const row = baseRow + dRow;
      const cell = canvas.cells[row]?.[col];
      if (cell && cell.letter === null) {
        cell.letter = letter;
        cell.creator = point.creator ?? null;
        cell.label = point.label;
        placed.push({ letter, point, row, col, creator: point.creator ?? null });
        return;
      }
    }
    placed.push({ letter, point, row: baseRow, col: baseCol, creator: point.creator ?? null });
  });
  return placed;
}

function styleMarker(
  letter: string,
  creator: string | null,
  outstanding: boolean,
  options: ResolvedOptions,
): string {
  if (!options.colorize || creator === null) {
    return outstanding ? `\x1b[1;4m${letter}\x1b[0m` : letter;
  }
  return colorizeText(letter, creator, outstanding, outstanding);
}

function renderCell(canvas: CanvasState, cell: CellState, options: ResolvedOptions): string {
  if (cell.letter !== null) {
    const outstanding = cell.label !== null && options.outstanding.has(cell.label);
    return styleMarker(cell.letter, cell.creator, outstanding, options);
  }
  if (canvas.braille) {
    return cell.dots > 0 ? String.fromCharCode(BRAILLE_BASE + cell.dots) : " ";
  }
  if (cell.vline && cell.hline) return "+";
  if (cell.vline) return "|";
  if (cell.hline) return "-";
  return cell.dots > 0 ? "." : " ";
}

function writeAt(chars: string[], start: number, text: string): void {
  for (let index = 0; index < text.length; index++) {
    const position = start + index;
    if (position >= 0 && position < chars.length) chars[position] = text[index] ?? "";
  }
}

function applyCornerLabels(
  chars: string[],
  canvasWidth: number,
  topRow: boolean,
  options: ResolvedOptions,
): void {
  if (canvasWidth < 40) return;
  const [tl, tr, bl, br] = options.cornerLabels;
  const left = topRow ? tl : bl;
  const right = topRow ? tr : br;
  writeAt(chars, CORNER_GAP, left);
  writeAt(chars, canvasWidth - right.length - CORNER_GAP, right);
}

function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return [];
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  let step = magnitude;
  for (const factor of [1, 2, 5, 10]) {
    if (rawStep <= factor * magnitude) {
      step = factor * magnitude;
      break;
    }
  }
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-6; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function logTicks(min: number, max: number): number[] {
  if (min <= 0 || max <= 0) return [];
  const ticks: number[] = [];
  for (
    let exponent = Math.floor(Math.log10(min));
    exponent <= Math.ceil(Math.log10(max));
    exponent++
  ) {
    const value = 10 ** exponent;
    if (value >= min && value <= max) ticks.push(value);
  }
  return ticks;
}

function computeYTickRows(points: PlotPoint[], options: ResolvedOptions, layout: Layout): TickRow[] {
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rows: TickRow[] = [];
  const used = new Set<number>();
  for (const tick of niceTicks(min, max, 6)) {
    const yDot = clampDot(layout.yToDotTop(tick), layout.canvas.heightDots - 1);
    const row = layout.canvas.braille ? Math.floor(yDot / 4) : yDot;
    if (used.has(row)) continue;
    used.add(row);
    rows.push({ row, label: options.yFormat(tick) });
  }
  return rows;
}

function computeXTickCols(points: PlotPoint[], options: ResolvedOptions, layout: Layout): TickCol[] {
  const values = points.map((point) => point.x);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ticks = options.logX ? logTicks(min, max) : niceTicks(min, max, 4);
  const cols: TickCol[] = [];
  const used = new Set<number>();
  for (const tick of ticks) {
    const xDot = clampDot(layout.xToDot(tick), layout.canvas.widthDots - 1);
    const col = layout.canvas.braille ? Math.floor(xDot / 2) : xDot;
    if (used.has(col)) continue;
    used.add(col);
    cols.push({ col, label: options.xFormat(tick) });
  }
  return cols;
}

function gutterWidthFor(labels: string[]): number {
  return Math.max(5, ...labels.map((label) => label.length + 2));
}

function truncate(text: string, width: number): string {
  return text.length > width ? text.slice(0, width) : text;
}

function legendHeader(options: ResolvedOptions): string {
  const modelWidth = options.legendWidth - 2 - LEGEND_X_WIDTH - 1 - LEGEND_Y_WIDTH;
  return `# ${"model".padEnd(modelWidth)}${"x".padStart(LEGEND_X_WIDTH)} ${"y".padStart(LEGEND_Y_WIDTH)}`;
}

function legendLine(marker: PlacedMarker, options: ResolvedOptions, modelWidth: number): string {
  const label = truncate(marker.point.label, modelWidth);
  const x = options.xFormat(marker.point.x);
  const y = options.yFormat(marker.point.y);
  const outstanding = options.outstanding.has(marker.point.label);
  const markerText = styleMarker(marker.letter, marker.creator, outstanding, options);
  const prefix = outstanding ? "★" : " ";
  return `${prefix}${markerText} ${label.padEnd(modelWidth)}${truncate(x, LEGEND_X_WIDTH).padStart(LEGEND_X_WIDTH)} ${truncate(y, LEGEND_Y_WIDTH).padStart(LEGEND_Y_WIDTH)}`;
}

function legendLinesFor(placed: PlacedMarker[], options: ResolvedOptions): string[] {
  const modelWidth = options.legendWidth - 2 - LEGEND_X_WIDTH - 1 - LEGEND_Y_WIDTH;
  const lines: string[] = [];
  const limit = options.height;
  placed.slice(0, Math.max(0, limit - 1)).forEach((marker) => {
    lines.push(legendLine(marker, options, modelWidth));
  });
  const overflow = placed.length - (limit - 1);
  if (overflow > 0) lines.push(`… +${overflow} more`);
  while (lines.length < limit) lines.push("");
  return lines;
}

function topBorder(options: ResolvedOptions, gutterWidth: number, legendHeaderText: string): string {
  const border = `┌${"─".repeat(options.width)}┐`;
  return `${" ".repeat(gutterWidth)} ${border}${legendHeaderText.length > 0 ? `  ${legendHeaderText}` : ""}`;
}

function bottomBorder(options: ResolvedOptions, gutterWidth: number, xTicks: TickCol[]): string {
  const chars = Array.from({ length: options.width }, () => "─");
  chars[0] = "└";
  chars[options.width - 1] = "┘";
  for (const tick of xTicks) chars[tick.col] = "┴";
  return `${" ".repeat(gutterWidth)} ${chars.join("")}`;
}

function xTickLabelLine(options: ResolvedOptions, gutterWidth: number, xTicks: TickCol[]): string {
  const chars = Array.from({ length: options.width }, () => " ");
  let previousEnd = -2;
  for (const tick of xTicks) {
    const start = Math.max(0, tick.col - Math.floor(tick.label.length / 2));
    const end = start + tick.label.length - 1;
    if (start <= previousEnd) continue;
    writeAt(chars, start, tick.label);
    previousEnd = end;
  }
  return `${" ".repeat(gutterWidth)} ${chars.join("")}`;
}

function statsLine(
  plotted: number,
  total: number,
  stats: QuadrantStats,
  options: ResolvedOptions,
): string {
  const xMedian = stats.medianX === null ? "—" : options.xFormat(stats.medianX);
  const yMedian = stats.medianY === null ? "—" : options.yFormat(stats.medianY);
  const highlight =
    options.outstanding.size > 0 ? `  ★ ${options.outstanding.size} outstanding` : "";
  return `n=${plotted}/${total}  median ${options.xLabel}: ${xMedian}  median ${options.yLabel}: ${yMedian}${highlight}`;
}

export function quadrantStats(points: PlotPoint[], options: QuadrantPlotOptions = {}): QuadrantStats {
  const resolved = resolveOptions(options);
  const valid = validPoints(points, resolved);
  return {
    medianX: median(valid.map((point) => point.x)),
    medianY: median(valid.map((point) => point.y)),
  };
}

export function renderQuadrantDetailed(
  points: PlotPoint[],
  options: QuadrantPlotOptions = {},
): QuadrantRenderResult {
  const resolved = resolveOptions(options);
  const valid = validPoints(points, resolved);
  if (valid.length === 0) {
    return {
      text: "(no plottable points)",
      stats: { medianX: null, medianY: null },
      placed: [],
      plotted: 0,
    };
  }
  const layout = buildLayout(valid, resolved);
  drawMedianLines(layout.canvas, layout.medianXDot, layout.medianYDotTop);
  const placed = placeMarkers(layout.canvas, layout, valid);
  const stats: QuadrantStats = {
    medianX: median(valid.map((point) => point.x)),
    medianY: median(valid.map((point) => point.y)),
  };

  const lines: string[] = [];
  if (resolved.title !== "") {
    lines.push(resolved.title);
    lines.push("");
  }

  const yTicks = computeYTickRows(valid, resolved, layout);
  const xTicks = computeXTickCols(valid, resolved, layout);
  const gutterWidth = gutterWidthFor(yTicks.map((tick) => tick.label));
  const legendLines = legendLinesFor(placed, resolved);
  const cornerRows = new Set([0, resolved.height - 1]);
  const canvasRows = layout.canvas.cells.map((row) =>
    row.map((cell) => renderCell(layout.canvas, cell, resolved)).join(""),
  );

  lines.push(topBorder(resolved, gutterWidth, legendHeader(resolved)));
  for (let row = 0; row < resolved.height; row++) {
    const chars = (canvasRows[row] ?? "").split("");
    if (cornerRows.has(row) && !resolved.colorize) {
      applyCornerLabels(chars, resolved.width, row === 0, resolved);
    }
    const tick = yTicks.find((entry) => entry.row === row);
    const gutter = (tick?.label ?? "").padStart(gutterWidth);
    const legend = legendLines[row] ?? "";
    const line = `${gutter} ${chars.join("")}${legend.length > 0 ? `  ${legend}` : ""}`;
    lines.push(line.trimEnd());
  }
  lines.push(bottomBorder(resolved, gutterWidth, xTicks));
  lines.push(xTickLabelLine(resolved, gutterWidth, xTicks).trimEnd());
  lines.push(statsLine(valid.length, points.length, stats, resolved));

  return { text: lines.join("\n"), stats, placed, plotted: valid.length };
}

export function renderQuadrant(points: PlotPoint[], options: QuadrantPlotOptions = {}): string {
  return renderQuadrantDetailed(points, options).text;
}

export interface ModelsPlotOptions {
  y?: YField;
  top?: number;
  sortBy?: SortField;
  logX?: boolean;
  ascii?: boolean;
  colorize?: boolean;
  width?: number;
  height?: number;
  title?: string;
}

export interface ModelPointInfo {
  points: PlotPoint[];
  total: number;
  plotted: number;
  omitted: number;
  yLabel: string;
  xLabel: string;
  cornerLabels: [string, string, string, string];
  title: string;
  outstanding: Set<string>;
}

interface YFieldSpec {
  label: string;
  high: string;
  low: string;
  value: (model: FreeModel) => number | null;
}

const Y_FIELD_SPECS: Record<YField, YFieldSpec> = {
  intelligence: {
    label: "Intelligence Index",
    high: "smart",
    low: "weaker",
    value: (model) => model.evaluations.artificial_analysis_intelligence_index,
  },
  coding: {
    label: "Coding Index",
    high: "strong coder",
    low: "weaker coder",
    value: (model) => model.evaluations.artificial_analysis_coding_index,
  },
  agentic: {
    label: "Agentic Index",
    high: "agentic",
    low: "less agentic",
    value: (model) => model.evaluations.artificial_analysis_agentic_index,
  },
  speed: {
    label: "speed (tok/s)",
    high: "fast",
    low: "slow",
    value: (model) => model.performance.median_output_tokens_per_second,
  },
};

const X_LABEL = "$/1M output tokens";

function sortValue(sortBy: SortField, model: FreeModel): number | null {
  if (sortBy === "value") return modelValue(model);
  return Y_FIELD_SPECS[sortBy].value(model);
}

export function modelsToPoints(models: FreeModel[], options: ModelsPlotOptions = {}): ModelPointInfo {
  const yField = options.y ?? "intelligence";
  const spec = Y_FIELD_SPECS[yField];
  const sortBy = options.sortBy ?? "value";
  const top = options.top ?? 25;
  const logX = options.logX ?? true;

  const candidates = models
    .map((model) => ({
      model,
      x: model.pricing.price_1m_output_tokens,
      y: spec.value(model),
    }))
    .filter(
      (candidate): candidate is { model: FreeModel; x: number; y: number } =>
        candidate.x !== null &&
        candidate.y !== null &&
        Number.isFinite(candidate.x) &&
        Number.isFinite(candidate.y),
    );
  const omitted = models.length - candidates.length;

  const sorted = [...candidates].sort((a, b) => {
    const aValue = sortValue(sortBy, a.model);
    const bValue = sortValue(sortBy, b.model);
    if (aValue !== null && bValue !== null && aValue !== bValue) return bValue - aValue;
    return b.y - a.y || a.x - b.x;
  });
  const selected = sorted.slice(0, top);
  const points: PlotPoint[] = selected.map((candidate) => ({
    label: candidate.model.slug,
    x: candidate.x,
    y: candidate.y,
    creator: candidate.model.model_creator.name,
  }));
  const outstanding = computeOutstanding(points, { logX }).outstanding;

  const cornerLabels: [string, string, string, string] = [
    `cheap + ${spec.high}`,
    `pricey + ${spec.high}`,
    `cheap + ${spec.low}`,
    `pricey + ${spec.low}`,
  ];
  return {
    points,
    total: models.length,
    plotted: points.length,
    omitted,
    yLabel: spec.label,
    xLabel: X_LABEL,
    cornerLabels,
    title: options.title ?? `${spec.label} vs ${X_LABEL}${logX ? " (log)" : ""}`,
    outstanding,
  };
}

export function renderModelsQuadrant(models: FreeModel[], options: ModelsPlotOptions = {}): string {
  const info = modelsToPoints(models, options);
  return renderQuadrant(info.points, {
    width: options.width ?? 60,
    height: options.height ?? 24,
    title: info.title,
    xLabel: info.xLabel,
    yLabel: info.yLabel,
    logX: options.logX ?? true,
    ascii: options.ascii ?? false,
    colorize: options.colorize ?? false,
    cornerLabels: info.cornerLabels,
    outstanding: info.outstanding,
    xFormat: (value) => `$${compactNumber(value)}`,
  });
}
