import type { FreeModel } from "../api/schemas.js";
import { modelValue } from "./metrics.js";
import { formatCurrency, formatNumber, formatRelease } from "./models-table.js";

export type CompareAlign = "left" | "right";
export type CompareBetter = "higher" | "lower" | null;

export interface CompareMetric {
  id: string;
  label: string;
  better: CompareBetter;
  align: CompareAlign;
  value: (model: FreeModel) => number | null;
  display: (model: FreeModel) => string;
}

export interface CompareCell {
  text: string;
  winner: boolean;
  align: CompareAlign;
}

export interface CompareRow {
  id: string;
  label: string;
  cells: CompareCell[];
}

export const COMPARE_LABEL_WIDTH = 10;
export const COMPARE_COL_MIN = 14;
export const COMPARE_COL_MAX = 16;
export const COMPARE_RULE = "│";

function releaseTimestamp(model: FreeModel): number | null {
  if (model.release_date === null) return null;
  const parsed = Date.parse(model.release_date);
  return Number.isFinite(parsed) ? parsed : null;
}

export const COMPARE_METRICS: readonly CompareMetric[] = [
  {
    id: "creator",
    label: "Creator",
    better: null,
    align: "left",
    value: () => null,
    display: (model) => model.model_creator.name,
  },
  {
    id: "intel",
    label: "Intel",
    better: "higher",
    align: "right",
    value: (model) => model.evaluations.artificial_analysis_intelligence_index,
    display: (model) => formatNumber(model.evaluations.artificial_analysis_intelligence_index),
  },
  {
    id: "code",
    label: "Code",
    better: "higher",
    align: "right",
    value: (model) => model.evaluations.artificial_analysis_coding_index,
    display: (model) => formatNumber(model.evaluations.artificial_analysis_coding_index),
  },
  {
    id: "agentic",
    label: "Agentic",
    better: "higher",
    align: "right",
    value: (model) => model.evaluations.artificial_analysis_agentic_index,
    display: (model) => formatNumber(model.evaluations.artificial_analysis_agentic_index),
  },
  {
    id: "speed",
    label: "Speed",
    better: "higher",
    align: "right",
    value: (model) => model.performance.median_output_tokens_per_second,
    display: (model) => formatNumber(model.performance.median_output_tokens_per_second, 0),
  },
  {
    id: "ttft",
    label: "TTFT",
    better: "lower",
    align: "right",
    value: (model) => model.performance.median_time_to_first_token_seconds,
    display: (model) => formatNumber(model.performance.median_time_to_first_token_seconds, 2),
  },
  {
    id: "e2e",
    label: "E2E",
    better: "lower",
    align: "right",
    value: (model) => model.performance.median_end_to_end_response_time_seconds,
    display: (model) => formatNumber(model.performance.median_end_to_end_response_time_seconds, 2),
  },
  {
    id: "value",
    label: "Value",
    better: "higher",
    align: "right",
    value: (model) => modelValue(model),
    display: (model) => formatNumber(modelValue(model)),
  },
  {
    id: "idx_cost",
    label: "Idx$",
    better: "lower",
    align: "right",
    value: (model) => model.artificial_analysis_intelligence_index_cost.total_cost,
    display: (model) => formatCurrency(model.artificial_analysis_intelligence_index_cost.total_cost),
  },
  {
    id: "input_price",
    label: "In $/1M",
    better: "lower",
    align: "right",
    value: (model) => model.pricing.price_1m_input_tokens,
    display: (model) => formatCurrency(model.pricing.price_1m_input_tokens),
  },
  {
    id: "output_price",
    label: "Out $/1M",
    better: "lower",
    align: "right",
    value: (model) => model.pricing.price_1m_output_tokens,
    display: (model) => formatCurrency(model.pricing.price_1m_output_tokens),
  },
  {
    id: "release",
    label: "Release",
    better: "higher",
    align: "right",
    value: releaseTimestamp,
    display: (model) => formatRelease(model.release_date),
  },
];

export function resolveCompareModels(models: FreeModel[], slugs: string[]): FreeModel[] {
  const bySlug = new Map(models.map((model) => [model.slug, model]));
  const seen = new Set<string>();
  const resolved: FreeModel[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    const model = bySlug.get(slug);
    if (model === undefined) continue;
    seen.add(slug);
    resolved.push(model);
  }
  return resolved;
}

export function winnerFlags(values: Array<number | null>, better: CompareBetter): boolean[] {
  if (better === null) return values.map(() => false);
  const nums = values.map((value) => (value !== null && Number.isFinite(value) ? value : null));
  const present = nums.filter((value): value is number => value !== null);
  if (present.length < 2) return values.map(() => false);
  const best = better === "higher" ? Math.max(...present) : Math.min(...present);
  if (present.every((value) => value === best)) return values.map(() => false);
  return nums.map((value) => value !== null && value === best);
}

export function buildCompareRows(models: FreeModel[]): CompareRow[] {
  return COMPARE_METRICS.map((metric) => {
    const values = models.map((model) => metric.value(model));
    const winners = winnerFlags(values, metric.better);
    return {
      id: metric.id,
      label: metric.label,
      cells: models.map((model, index) => ({
        text: metric.display(model),
        winner: winners[index] ?? false,
        align: metric.align,
      })),
    };
  });
}

export function compareLayout(
  width: number,
  modelCount: number,
): { labelWidth: number; colWidth: number; visible: number } {
  const labelWidth = COMPARE_LABEL_WIDTH;
  if (modelCount <= 0) {
    return { labelWidth, colWidth: COMPARE_COL_MAX, visible: 0 };
  }
  const available = Math.max(COMPARE_COL_MIN, width - labelWidth - COMPARE_RULE.length);
  const visible = Math.min(modelCount, Math.max(1, Math.floor(available / COMPARE_COL_MIN)));
  const colWidth = Math.min(
    COMPARE_COL_MAX,
    Math.max(COMPARE_COL_MIN, Math.floor(available / visible)),
  );
  return { labelWidth, colWidth, visible };
}

export function clampCompareOffset(offset: number, total: number, visible: number): number {
  if (total <= visible) return 0;
  return Math.max(0, Math.min(offset, total - visible));
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

export function formatCompareCell(
  text: string,
  width: number,
  winner: boolean,
  align: CompareAlign,
): string {
  const inner = Math.max(1, width - 1);
  const truncated = truncate(text, inner);
  const body = align === "right" ? truncated.padStart(inner) : truncated.padEnd(inner);
  return `${body}${winner ? "★" : " "}`;
}

export function formatCompareTable(models: FreeModel[], width: number, offset = 0): string {
  const { labelWidth, colWidth, visible } = compareLayout(width, models.length);
  const start = clampCompareOffset(offset, models.length, visible);
  const end = start + visible;
  const header =
    "".padEnd(labelWidth) +
    COMPARE_RULE +
    models
      .slice(start, end)
      .map((model) => formatCompareCell(model.slug, colWidth, false, "left"))
      .join("");
  const rows = buildCompareRows(models).map((row) => {
    const label = `${row.label.padEnd(labelWidth)}${COMPARE_RULE}`;
    const cells = row.cells
      .slice(start, end)
      .map((cell) => formatCompareCell(cell.text, colWidth, cell.winner, cell.align))
      .join("");
    return `${label}${cells}`;
  });
  return [header, ...rows].join("\n");
}
