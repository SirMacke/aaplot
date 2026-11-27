import type { FreeModel } from "../api/schemas.js";
import { modelValue } from "./metrics.js";
import {
  COMPARE_LABEL_WIDTH,
  COMPARE_COL_MAX,
  COMPARE_METRICS,
  formatCompareTable,
  resolveCompareModels,
  winnerFlags,
} from "./compare-table.js";
import {
  formatCurrency,
  formatNumber,
  formatRelease,
  prepareModelTable,
  type ModelSortField,
  type ModelTableFilters,
} from "./models-table.js";
import {
  modelsToPoints,
  quadrantStats,
  renderModelsQuadrant,
  type SortField,
  type XField,
  type YField,
} from "../render/plot.js";

export const ATTRIBUTION = "Data: Artificial Analysis — artificialanalysis.ai";

export type DataSource = "demo" | "live" | "cache";

export interface DatasetMeta {
  source: DataSource;
  indexVersion: number | null;
  /** ISO timestamp of the fetch; null for synthetic demo data. */
  updatedAt: string | null;
  stale: boolean;
}

export interface ModelRecord {
  slug: string;
  name: string;
  creator: string;
  release_date: string | null;
  intelligence_index: number | null;
  coding_index: number | null;
  agentic_index: number | null;
  value: number | null;
  index_run_cost: number | null;
  price_1m_input_tokens: number | null;
  price_1m_output_tokens: number | null;
  price_1m_cache_hit_tokens: number | null;
  price_1m_cache_write_tokens: number | null;
  median_output_tokens_per_second: number | null;
  median_time_to_first_token_seconds: number | null;
  median_end_to_end_response_time_seconds: number | null;
}

export interface ModelsOutputOptions {
  filters: ModelTableFilters;
  sort: ModelSortField;
  top: number | null;
}

export interface PlotOutputOptions {
  filters: ModelTableFilters;
  y: YField;
  x: XField;
  sortBy: SortField;
  top: number;
  ascii: boolean;
  color: boolean;
  width: number;
  height: number | null;
}

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function roundTo(value: number | null, digits = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function modelRecord(model: FreeModel): ModelRecord {
  return {
    slug: model.slug,
    name: model.name,
    creator: model.model_creator.name,
    release_date: model.release_date,
    intelligence_index: model.evaluations.artificial_analysis_intelligence_index,
    coding_index: model.evaluations.artificial_analysis_coding_index,
    agentic_index: model.evaluations.artificial_analysis_agentic_index,
    value: roundTo(modelValue(model)),
    index_run_cost: model.artificial_analysis_intelligence_index_cost.total_cost,
    price_1m_input_tokens: model.pricing.price_1m_input_tokens,
    price_1m_output_tokens: model.pricing.price_1m_output_tokens,
    price_1m_cache_hit_tokens: model.pricing.price_1m_cache_hit_tokens,
    price_1m_cache_write_tokens: model.pricing.price_1m_cache_write_tokens,
    median_output_tokens_per_second: model.performance.median_output_tokens_per_second,
    median_time_to_first_token_seconds: model.performance.median_time_to_first_token_seconds,
    median_end_to_end_response_time_seconds:
      model.performance.median_end_to_end_response_time_seconds,
  };
}

function metaJson(meta: DatasetMeta) {
  return {
    attribution: ATTRIBUTION,
    source: meta.source,
    index_version: meta.indexVersion,
    updated_at: meta.updatedAt,
    stale: meta.stale,
  };
}

function filtersJson(filters: ModelTableFilters) {
  return {
    creator: filters.creator,
    min_quality: filters.minQuality,
    max_cost: filters.maxCost,
    cheap: filters.cheap,
  };
}

function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function footer(meta: DatasetMeta): string {
  const parts = [ATTRIBUTION];
  if (meta.indexVersion !== null) parts.push(`Index v${meta.indexVersion}`);
  if (meta.source === "demo") parts.push("synthetic demo data");
  else if (meta.updatedAt !== null) parts.push(`updated ${meta.updatedAt}`);
  if (meta.stale) parts.push("stale cache");
  return parts.join(" · ");
}

export function selectModels(models: FreeModel[], options: ModelsOutputOptions): FreeModel[] {
  const rows = prepareModelTable(models, options.filters, options.sort);
  return options.top === null ? rows : rows.slice(0, options.top);
}

export function formatModelsJson(
  models: FreeModel[],
  meta: DatasetMeta,
  options: ModelsOutputOptions,
): string {
  const rows = selectModels(models, options);
  return toJson({
    ...metaJson(meta),
    filters: filtersJson(options.filters),
    sort: options.sort,
    count: rows.length,
    models: rows.map(modelRecord),
  });
}

interface TextColumn {
  header: string;
  align: "left" | "right";
  cell: (model: FreeModel, rank: number) => string;
}

const MODEL_TEXT_COLUMNS: readonly TextColumn[] = [
  { header: "#", align: "right", cell: (_model, rank) => String(rank) },
  { header: "slug", align: "left", cell: (model) => model.slug },
  { header: "creator", align: "left", cell: (model) => model.model_creator.name },
  {
    header: "intel",
    align: "right",
    cell: (model) => formatNumber(model.evaluations.artificial_analysis_intelligence_index),
  },
  {
    header: "code",
    align: "right",
    cell: (model) => formatNumber(model.evaluations.artificial_analysis_coding_index),
  },
  { header: "value", align: "right", cell: (model) => formatNumber(modelValue(model)) },
  {
    header: "idx$",
    align: "right",
    cell: (model) => formatCurrency(model.artificial_analysis_intelligence_index_cost.total_cost),
  },
  {
    header: "out$/1M",
    align: "right",
    cell: (model) => formatCurrency(model.pricing.price_1m_output_tokens),
  },
  {
    header: "tok/s",
    align: "right",
    cell: (model) => formatNumber(model.performance.median_output_tokens_per_second, 0),
  },
  { header: "release", align: "left", cell: (model) => formatRelease(model.release_date) },
];

export function formatModelsText(
  models: FreeModel[],
  meta: DatasetMeta,
  options: ModelsOutputOptions,
): string {
  const rows = selectModels(models, options);
  if (rows.length === 0) return `no models match the filters\n${footer(meta)}\n`;
  const cells = rows.map((model, index) =>
    MODEL_TEXT_COLUMNS.map((column) => column.cell(model, index + 1)),
  );
  const widths = MODEL_TEXT_COLUMNS.map((column, columnIndex) =>
    Math.max(column.header.length, ...cells.map((row) => (row[columnIndex] ?? "").length)),
  );
  const line = (values: string[]) =>
    values
      .map((value, columnIndex) => {
        const width = widths[columnIndex] ?? value.length;
        return MODEL_TEXT_COLUMNS[columnIndex]?.align === "right"
          ? value.padStart(width)
          : value.padEnd(width);
      })
      .join("  ")
      .trimEnd();
  const header = line(MODEL_TEXT_COLUMNS.map((column) => column.header));
  const body = cells.map(line);
  return [
    header,
    ...body,
    "",
    `${rows.length} models · sorted by ${options.sort} (desc) · value = intelligence / index-run $`,
    footer(meta),
    "",
  ].join("\n");
}

function plotHeight(options: PlotOutputOptions, plotted: number): number {
  return options.height ?? Math.max(24, plotted + 2);
}

function plotInput(models: FreeModel[], options: PlotOutputOptions) {
  const filtered = prepareModelTable(models, options.filters, "value");
  const modelOptions = {
    y: options.y,
    x: options.x,
    top: options.top,
    sortBy: options.sortBy,
  };
  return { filtered, info: modelsToPoints(filtered, modelOptions), modelOptions };
}

export function formatPlotText(
  models: FreeModel[],
  meta: DatasetMeta,
  options: PlotOutputOptions,
): string {
  const { filtered, info, modelOptions } = plotInput(models, options);
  const { text } = renderModelsQuadrant(filtered, {
    ...modelOptions,
    ascii: options.ascii,
    colorize: options.color,
    ansi: options.color,
    width: options.width,
    height: plotHeight(options, info.plotted),
  });
  return `${text}\n★ marks outstanding models (cost-band leaders and the Pareto frontier)\n${footer(meta)}\n`;
}

/**
 * Stable quadrant key for scripts: x side of the median (cheap = at or below)
 * then y side (high = at or above). `quadrant` is the display label, which
 * changes with the Y axis ("cheap + smart", "cheap + fast", ...).
 */
export type QuadrantId = "cheap_high" | "pricey_high" | "cheap_low" | "pricey_low";

export function formatPlotJson(
  models: FreeModel[],
  meta: DatasetMeta,
  options: PlotOutputOptions,
): string {
  const { filtered, info } = plotInput(models, options);
  const stats = quadrantStats(info.points);
  const bySlug = new Map(filtered.map((model) => [model.slug, model]));
  const [cheapHigh, priceyHigh, cheapLow, priceyLow] = info.cornerLabels;
  const quadrantOf = (x: number, y: number): { id: QuadrantId; label: string } => {
    const cheap = stats.medianX === null || x <= stats.medianX;
    const high = stats.medianY === null || y >= stats.medianY;
    if (high)
      return cheap
        ? { id: "cheap_high", label: cheapHigh }
        : { id: "pricey_high", label: priceyHigh };
    return cheap ? { id: "cheap_low", label: cheapLow } : { id: "pricey_low", label: priceyLow };
  };
  return toJson({
    ...metaJson(meta),
    filters: filtersJson(options.filters),
    title: info.title,
    y: options.y,
    x: options.x,
    y_label: info.yLabel,
    x_label: info.xLabel,
    log_x: true,
    sort: options.sortBy,
    top: options.top,
    total: info.total,
    plotted: info.plotted,
    omitted: info.omitted,
    median_x: roundTo(stats.medianX),
    median_y: roundTo(stats.medianY),
    points: info.points.map((point) => {
      const model = bySlug.get(point.label);
      return {
        slug: point.label,
        name: model?.name ?? point.label,
        creator: point.creator ?? null,
        x: point.x,
        y: point.y,
        quadrant: quadrantOf(point.x, point.y).label,
        quadrant_id: quadrantOf(point.x, point.y).id,
        outstanding: info.outstanding.has(point.label),
      };
    }),
  });
}

export function missingCompareSlugs(models: FreeModel[], slugs: string[]): string[] {
  const known = new Set(models.map((model) => model.slug));
  return [...new Set(slugs)].filter((slug) => !known.has(slug));
}

export function formatCompareJson(models: FreeModel[], meta: DatasetMeta, slugs: string[]): string {
  const resolved = resolveCompareModels(models, slugs);
  const metrics = COMPARE_METRICS.filter((metric) => metric.better !== null).map((metric) => {
    const winners = winnerFlags(
      resolved.map((model) => metric.value(model)),
      metric.better,
    );
    return {
      id: metric.id,
      label: metric.label,
      better: metric.better,
      values: Object.fromEntries(
        resolved.map((model) => [
          model.slug,
          metric.id === "release" ? model.release_date : roundTo(metric.value(model)),
        ]),
      ),
      winners: resolved.filter((_model, index) => winners[index]).map((model) => model.slug),
    };
  });
  return toJson({
    ...metaJson(meta),
    slugs: resolved.map((model) => model.slug),
    models: resolved.map(modelRecord),
    metrics,
  });
}

export function formatCompareText(models: FreeModel[], meta: DatasetMeta, slugs: string[]): string {
  const resolved = resolveCompareModels(models, slugs);
  const width = COMPARE_LABEL_WIDTH + 1 + resolved.length * COMPARE_COL_MAX;
  const table = formatCompareTable(resolved, width)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  return `${table}\n\n★ best value in each row\n${footer(meta)}\n`;
}
