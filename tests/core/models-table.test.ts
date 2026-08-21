import { describe, expect, it } from "vitest";
import { demoModels } from "../../src/api/demo.js";
import {
  activeFilterLabels,
  filterModels,
  formatColumnHeader,
  formatSortStatus,
  modelTableLayout,
  prepareModelTable,
  sortModels,
  type ModelTableFilters,
} from "../../src/core/models-table.js";

const BASE_FILTERS: ModelTableFilters = {
  query: "",
  creator: null,
  minQuality: null,
  maxCost: null,
  cheap: false,
};

describe("filterModels", () => {
  it("filters by creator, quality, cost, cheap, and search query", () => {
    const models = demoModels();

    expect(filterModels(models, { ...BASE_FILTERS, creator: "Kestrel" })).toHaveLength(6);
    expect(filterModels(models, { ...BASE_FILTERS, minQuality: 70 }).every((model) => {
      const intel = model.evaluations.artificial_analysis_intelligence_index;
      return intel !== null && intel >= 70;
    })).toBe(true);
    expect(filterModels(models, { ...BASE_FILTERS, maxCost: 5 }).every((model) => {
      const cost = model.artificial_analysis_intelligence_index_cost.total_cost;
      return cost !== null && cost <= 5;
    })).toBe(true);
    expect(filterModels(models, { ...BASE_FILTERS, query: "flash" })).toEqual([
      expect.objectContaining({ slug: "kestrel-flash" }),
    ]);
    const cheap = filterModels(models, { ...BASE_FILTERS, cheap: true });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.length).toBeLessThan(models.length);
  });
});

describe("sortModels", () => {
  it("sorts by value descending by default", () => {
    const sorted = sortModels(demoModels(), "value", false);
    expect(sorted[0]?.slug).toBe("halcyon-s");
  });

  it("sorts by release date ascending", () => {
    const sorted = sortModels(demoModels(), "release", true);
    expect(sorted[0]?.release_date).toBe("2024-11-11");
    expect(sorted.at(-1)?.release_date).toBe("2026-06-11");
  });
});

describe("prepareModelTable", () => {
  it("applies filters then sort order", () => {
    const rows = prepareModelTable(
      demoModels(),
      { ...BASE_FILTERS, creator: "Kestrel", query: "flash" },
      "speed",
      false,
    );
    expect(rows).toEqual([expect.objectContaining({ slug: "kestrel-flash" })]);
  });
});

describe("modelTableLayout", () => {
  it("uses fixed creator and slug widths on wide terminals", () => {
    const layout = modelTableLayout(140, false);
    expect(layout.slugWidth).toBe(22);
    expect(layout.creatorWidth).toBe(14);
  });

  it("hides creator and uses a compact slug width on narrow terminals", () => {
    const layout = modelTableLayout(80, true);
    expect(layout.slugWidth).toBe(16);
    expect(layout.creatorWidth).toBe(0);
  });
});

describe("formatColumnHeader", () => {
  it("bolds the active sort column and appends a direction arrow", () => {
    const header = formatColumnHeader("intel", "intel", false);
    expect(header).toContain("\x1b[1m");
    expect(header).toContain("Intel↓");
    expect(header).toContain("\x1b[22m");
  });
});

describe("formatSortStatus", () => {
  it("describes the active sort direction in plain language", () => {
    expect(formatSortStatus("release", false)).toBe("release ↓ (newest)");
  });
});

describe("activeFilterLabels", () => {
  it("summarises active filters", () => {
    expect(
      activeFilterLabels({
        ...BASE_FILTERS,
        creator: "Nimbus",
        cheap: true,
        query: "mini",
      }),
    ).toEqual(["creator:Nimbus", "cheap", 'search:"mini"']);
  });
});
