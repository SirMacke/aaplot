import type { FreeModel } from "../api/schemas.js";

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function modelValue(model: FreeModel): number | null {
  const intelligence = model.evaluations.artificial_analysis_intelligence_index;
  const cost = model.artificial_analysis_intelligence_index_cost.total_cost;
  if (intelligence === null || cost === null || cost <= 0) return null;
  return intelligence / cost;
}
