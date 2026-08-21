import { describe, expect, it } from "vitest";
import {
  assignCostBands,
  computeOutstanding,
  findBandLeaders,
  findParetoFrontier,
} from "../../src/core/plot-highlights.js";
import type { PlotPoint } from "../../src/render/plot.js";

const SAMPLE: PlotPoint[] = [
  { label: "cheap-a", x: 0.1, y: 40, creator: "A" },
  { label: "cheap-b", x: 0.2, y: 55, creator: "B" },
  { label: "mid-a", x: 2, y: 60, creator: "C" },
  { label: "mid-b", x: 3, y: 70, creator: "D" },
  { label: "high-a", x: 20, y: 65, creator: "E" },
  { label: "high-b", x: 30, y: 80, creator: "F" },
];

describe("assignCostBands", () => {
  it("splits points into cheap, mid, and high bands on log X", () => {
    const bands = assignCostBands(SAMPLE, true);
    expect(bands.get("cheap-a")).toBe("cheap");
    expect(bands.get("high-b")).toBe("high");
    expect(new Set(bands.values())).toEqual(new Set(["cheap", "mid", "high"]));
  });
});

describe("findBandLeaders", () => {
  it("picks the highest-Y model in each cost band", () => {
    const leaders = findBandLeaders(SAMPLE, true, 1);
    expect(leaders.has("cheap-b")).toBe(true);
    expect(leaders.has("mid-b")).toBe(true);
    expect(leaders.has("high-b")).toBe(true);
  });
});

describe("findParetoFrontier", () => {
  it("includes non-dominated models on intel vs cost", () => {
    const frontier = findParetoFrontier(SAMPLE);
    expect(frontier.has("cheap-a")).toBe(true);
    expect(frontier.has("high-b")).toBe(true);
    expect(frontier.size).toBeGreaterThan(2);
  });
});

describe("computeOutstanding", () => {
  it("combines band leaders and the Pareto frontier", () => {
    const result = computeOutstanding(SAMPLE, { logX: true, topPerBand: 1 });
    expect(result.outstanding.size).toBeGreaterThanOrEqual(3);
    expect(result.pareto.size).toBeGreaterThan(0);
  });
});
