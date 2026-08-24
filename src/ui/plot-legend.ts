import type { LegendSortField } from "../render/plot.js";

const DEFAULT_LEGEND_ASC: Record<LegendSortField, boolean> = {
  y: false,
  x: true,
  model: true,
};

export function toggleLegendSort(
  field: LegendSortField,
  current: LegendSortField,
  currentAsc: boolean,
): { sort: LegendSortField; asc: boolean } {
  if (field === current) {
    return { sort: field, asc: !currentAsc };
  }
  return { sort: field, asc: DEFAULT_LEGEND_ASC[field] };
}

export function formatLegendSortStatus(sort: LegendSortField, ascending: boolean): string {
  const arrow = ascending ? "↑" : "↓";
  switch (sort) {
    case "x":
      return `x${arrow}`;
    case "model":
      return `model${arrow}`;
    case "y":
    default:
      return `y${arrow}`;
  }
}

export function clampLegendOffset(offset: number, total: number, pageSize: number): number {
  if (total <= pageSize) return 0;
  return Math.max(0, Math.min(offset, total - pageSize));
}
