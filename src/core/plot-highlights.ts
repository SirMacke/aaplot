import type { PlotPoint } from "../render/plot.js";

export type CostBand = "cheap" | "mid" | "high";

export interface OutstandingResult {
  outstanding: Set<string>;
  bands: Map<string, CostBand>;
  pareto: Set<string>;
}

function xScale(point: PlotPoint, logX: boolean): number {
  return logX ? Math.log10(point.x) : point.x;
}

export function assignCostBands(points: PlotPoint[], logX: boolean): Map<string, CostBand> {
  const ranked = [...points].sort(
    (left, right) => xScale(left, logX) - xScale(right, logX) || left.label.localeCompare(right.label),
  );
  const third = Math.max(1, Math.ceil(ranked.length / 3));
  const bands = new Map<string, CostBand>();
  ranked.forEach((point, index) => {
    const band: CostBand = index < third ? "cheap" : index < third * 2 ? "mid" : "high";
    bands.set(point.label, band);
  });
  return bands;
}

export function findBandLeaders(
  points: PlotPoint[],
  logX: boolean,
  topPerBand = 2,
): Set<string> {
  const bands = assignCostBands(points, logX);
  const grouped = new Map<CostBand, PlotPoint[]>();
  for (const point of points) {
    const band = bands.get(point.label) ?? "mid";
    const bucket = grouped.get(band) ?? [];
    bucket.push(point);
    grouped.set(band, bucket);
  }

  const leaders = new Set<string>();
  for (const band of ["cheap", "mid", "high"] as CostBand[]) {
    const ranked = (grouped.get(band) ?? []).sort(
      (left, right) => right.y - left.y || left.x - right.x || left.label.localeCompare(right.label),
    );
    for (const point of ranked.slice(0, topPerBand)) {
      leaders.add(point.label);
    }
  }
  return leaders;
}

export function findParetoFrontier(points: PlotPoint[]): Set<string> {
  const frontier = new Set<string>();
  for (const candidate of points) {
    let dominated = false;
    for (const other of points) {
      if (other.label === candidate.label) continue;
      const smarter = other.y >= candidate.y;
      const cheaper = other.x <= candidate.x;
      const strictlyBetter = other.y > candidate.y || other.x < candidate.x;
      if (smarter && cheaper && strictlyBetter) {
        dominated = true;
        break;
      }
    }
    if (!dominated) frontier.add(candidate.label);
  }
  return frontier;
}

export function computeOutstanding(
  points: PlotPoint[],
  options: { logX?: boolean; topPerBand?: number } = {},
): OutstandingResult {
  const logX = options.logX ?? true;
  const bands = assignCostBands(points, logX);
  const bandLeaders = findBandLeaders(points, logX, options.topPerBand ?? 2);
  const pareto = findParetoFrontier(points);
  const outstanding = new Set(bandLeaders);
  for (const label of pareto) outstanding.add(label);
  return { outstanding, bands, pareto };
}
