import { describe, expect, it } from "vitest";
import {
  clampLegendOffset,
  formatLegendSortStatus,
  toggleLegendSort,
} from "../../src/ui/plot-legend.js";

describe("plot legend helpers", () => {
  it("toggles sort direction on the active column", () => {
    expect(toggleLegendSort("y", "y", false)).toEqual({ sort: "y", asc: true });
    expect(toggleLegendSort("y", "y", true)).toEqual({ sort: "y", asc: false });
  });

  it("switches columns with sensible defaults", () => {
    expect(toggleLegendSort("x", "y", false)).toEqual({ sort: "x", asc: true });
    expect(toggleLegendSort("model", "y", false)).toEqual({ sort: "model", asc: true });
  });

  it("formats the active sort for the status line", () => {
    expect(formatLegendSortStatus("y", false)).toBe("y↓");
    expect(formatLegendSortStatus("model", true)).toBe("model↑");
  });

  it("clamps scroll offsets to valid pages", () => {
    expect(clampLegendOffset(5, 10, 4)).toBe(5);
    expect(clampLegendOffset(99, 10, 4)).toBe(6);
    expect(clampLegendOffset(-3, 10, 4)).toBe(0);
    expect(clampLegendOffset(2, 3, 4)).toBe(0);
  });
});
