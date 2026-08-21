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
  cost: "cost",
  speed: "speed",
  release: "release",
};

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

export function modelTableLayout(width: number, narrow: boolean): ModelTableLayout {
  const marker = 1;
  const intel = 6;
  const code = narrow ? 0 : 6;
  const value = 7;
  const cost = narrow ? 0 : 7;
  const speed = narrow ? 0 : 7;
  const release = narrow ? 0 : 11;
  const creatorWidth = narrow ? 0 : 16;
  const fixed = marker + intel + code + value + cost + speed + release + creatorWidth;
  const minSlug = narrow ? 18 : 32;
  return { slugWidth: Math.max(minSlug, width - fixed - 2), creatorWidth };
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
