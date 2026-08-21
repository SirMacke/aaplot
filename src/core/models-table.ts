import type { FreeModel } from "../api/schemas.js";
import { median, modelValue } from "./metrics.js";

export type ModelSortField = "intel" | "code" | "value" | "cost" | "speed" | "release";

export interface ModelTableFilters {
  query: string;
  creator: string | null;
  minQuality: number | null;
  maxCost: number | null;
  cheap: boolean;
}

export const MODEL_SORT_FIELDS: readonly ModelSortField[] = [
  "intel",
  "code",
  "value",
  "cost",
  "speed",
  "release",
];

export const MODEL_SORT_LABELS: Record<ModelSortField, string> = {
  intel: "intel",
  code: "code",
  value: "value",
  cost: "idx$",
  speed: "speed",
  release: "release",
};

export const MODEL_SORT_KEYS: Record<ModelSortField, string> = {
  intel: "i",
  code: "c",
  value: "v",
  cost: "$",
  speed: "s",
  release: "d",
};

export const MODEL_COLUMN_HEADERS: Record<ModelSortField, string> = {
  intel: "Intel",
  code: "Code",
  value: "Value",
  cost: "Idx$",
  speed: "Speed",
  release: "Date",
};

export const MODEL_SORT_DESCRIPTIONS: Record<
  ModelSortField,
  { desc: string; asc: string }
> = {
  intel: { desc: "highest intel", asc: "lowest intel" },
  code: { desc: "highest code", asc: "lowest code" },
  value: { desc: "best value", asc: "worst value" },
  cost: { desc: "lowest idx$", asc: "highest idx$" },
  speed: { desc: "fastest", asc: "slowest" },
  release: { desc: "newest", asc: "oldest" },
};

export const MODEL_COL_WIDTH: Record<ModelSortField, number> = {
  intel: 7,
  code: 7,
  value: 8,
  cost: 8,
  speed: 8,
  release: 11,
};

const HEADER_BOLD_ON = "\x1b[1m";
const HEADER_BOLD_OFF = "\x1b[22m";

export function formatSortStatus(sort: ModelSortField, ascending: boolean): string {
  const hint = ascending ? MODEL_SORT_DESCRIPTIONS[sort].asc : MODEL_SORT_DESCRIPTIONS[sort].desc;
  const arrow = ascending ? "↑" : "↓";
  return `${MODEL_SORT_LABELS[sort]} ${arrow} (${hint})`;
}

/** Bold label + arrow on the active sort column; fixed width includes the arrow. */
export function formatColumnHeader(
  field: ModelSortField,
  activeSort: ModelSortField,
  ascending: boolean,
): string {
  const label = MODEL_COLUMN_HEADERS[field];
  const width = MODEL_COL_WIDTH[field];
  const alignStart = field !== "value" && field !== "cost";
  if (field !== activeSort) {
    return alignStart ? label.padEnd(width) : label.padStart(width);
  }
  const arrow = ascending ? "↑" : "↓";
  const text = `${label}${arrow}`;
  const padded = alignStart ? text.padEnd(width) : text.padStart(width);
  return `${HEADER_BOLD_ON}${padded}${HEADER_BOLD_OFF}`;
}

export function columnGap(): string {
  return " ";
}

function outputPrice(model: FreeModel): number | null {
  return model.pricing.price_1m_output_tokens;
}

function totalCost(model: FreeModel): number | null {
  return model.artificial_analysis_intelligence_index_cost.total_cost;
}

function intelligence(model: FreeModel): number | null {
  return model.evaluations.artificial_analysis_intelligence_index;
}

function coding(model: FreeModel): number | null {
  return model.evaluations.artificial_analysis_coding_index;
}

function speed(model: FreeModel): number | null {
  return model.performance.median_output_tokens_per_second;
}

function releaseTimestamp(model: FreeModel): number | null {
  if (model.release_date === null) return null;
  const parsed = Date.parse(model.release_date);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortKey(model: FreeModel, field: ModelSortField): number | null {
  switch (field) {
    case "intel":
      return intelligence(model);
    case "code":
      return coding(model);
    case "value":
      return modelValue(model);
    case "cost":
      return totalCost(model);
    case "speed":
      return speed(model);
    case "release":
      return releaseTimestamp(model);
  }
}

function cheapThreshold(models: FreeModel[]): number | null {
  const prices = models.map(outputPrice).filter((value): value is number => value !== null);
  return median(prices);
}

export function filterModels(models: FreeModel[], filters: ModelTableFilters): FreeModel[] {
  const threshold = filters.cheap ? cheapThreshold(models) : null;
  const query = filters.query.trim().toLowerCase();
  const creator = filters.creator?.trim().toLowerCase() ?? null;

  return models.filter((model) => {
    if (creator !== null && !model.model_creator.name.toLowerCase().includes(creator)) return false;
    if (filters.minQuality !== null) {
      const intel = intelligence(model);
      if (intel === null || intel < filters.minQuality) return false;
    }
    if (filters.maxCost !== null) {
      const cost = totalCost(model);
      if (cost === null || cost > filters.maxCost) return false;
    }
    if (threshold !== null) {
      const price = outputPrice(model);
      if (price === null || price > threshold) return false;
    }
    if (query !== "") {
      const haystack = `${model.name} ${model.slug} ${model.model_creator.name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortModels(
  models: FreeModel[],
  field: ModelSortField,
  ascending = false,
): FreeModel[] {
  const direction = ascending ? 1 : -1;
  return [...models].sort((left, right) => {
    const leftKey = sortKey(left, field);
    const rightKey = sortKey(right, field);
    if (leftKey !== null && rightKey !== null && leftKey !== rightKey) {
      return (leftKey - rightKey) * direction;
    }
    if (leftKey !== null && rightKey === null) return -1;
    if (leftKey === null && rightKey !== null) return 1;
    return left.name.localeCompare(right.name);
  });
}

export function prepareModelTable(
  models: FreeModel[],
  filters: ModelTableFilters,
  sort: ModelSortField,
  ascending = false,
): FreeModel[] {
  return sortModels(filterModels(models, filters), sort, ascending);
}

export function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return `${trimZeros((value / 1000).toFixed(1))}k`;
  return trimZeros(value.toFixed(digits));
}

export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 100) return `$${trimZeros(value.toFixed(0))}`;
  if (value >= 10) return `$${trimZeros(value.toFixed(1))}`;
  return `$${trimZeros(value.toFixed(2))}`;
}

export function formatRelease(value: string | null): string {
  if (value === null) return "—";
  return value.slice(0, 10);
}

function trimZeros(text: string): string {
  return text.replace(/\.?0+$/, "").replace(/^-0$/, "0");
}

export interface ModelTableLayout {
  slugWidth: number;
  creatorWidth: number;
}

export function modelTableLayout(_width: number, narrow: boolean): ModelTableLayout {
  return {
    creatorWidth: narrow ? 0 : 14,
    slugWidth: narrow ? 16 : 22,
  };
}

export function activeFilterLabels(filters: ModelTableFilters): string[] {
  const labels: string[] = [];
  if (filters.creator !== null) labels.push(`creator:${filters.creator}`);
  if (filters.minQuality !== null) labels.push(`min-q:${filters.minQuality}`);
  if (filters.maxCost !== null) labels.push(`max-cost:${filters.maxCost}`);
  if (filters.cheap) labels.push("cheap");
  if (filters.query.trim() !== "") labels.push(`search:"${filters.query.trim()}"`);
  return labels;
}
