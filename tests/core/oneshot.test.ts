import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoModels } from "../../src/api/demo.js";
import {
  formatCompareJson,
  formatCompareText,
  formatModelsJson,
  formatModelsText,
  formatPlotJson,
  formatPlotText,
  missingCompareSlugs,
  stripAnsi,
  type DatasetMeta,
  type PlotOutputOptions,
} from "../../src/core/oneshot.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "oneshot",
);

function golden(name: string, actual: string): void {
  const fixturePath = path.join(fixturesDir, name);
  if (process.env.UPDATE_GOLDEN === "1") {
    writeFileSync(fixturePath, actual);
  }
  expect(actual).toBe(readFileSync(fixturePath, "utf8"));
}

const initialFilters = { query: "", creator: null, minQuality: null, maxCost: null, cheap: false };
const META: DatasetMeta = { source: "demo", indexVersion: 4.1, updatedAt: null, stale: false };
const MODELS_OPTIONS = { filters: initialFilters, sort: "value", top: null } as const;
const PLOT_OPTIONS: PlotOutputOptions = {
  filters: initialFilters,
  y: "intelligence",
  x: "index_run_cost",
  sortBy: "intelligence",
  top: 25,
  ascii: false,
  color: false,
  width: 60,
  height: null,
};
const COMPARE_SLUGS = ["kestrel-1", "nimbus-omni", "halcyon-pro"];

describe("aaplot models", () => {
  it("matches the golden text table", () => {
    golden("models.txt", formatModelsText(demoModels(), META, MODELS_OPTIONS));
  });

  it("matches the golden JSON", () => {
    golden("models.json", formatModelsJson(demoModels(), META, MODELS_OPTIONS));
  });

  it("applies filters, sort and --top", () => {
    const parsed = JSON.parse(
      formatModelsJson(demoModels(), META, {
        filters: { ...initialFilters, creator: "kestrel", minQuality: 60 },
        sort: "intel",
        top: 2,
      }),
    ) as { count: number; models: Array<{ slug: string }> };
    expect(parsed.count).toBe(2);
    expect(parsed.models.map((model) => model.slug)).toEqual(["kestrel-1-max", "kestrel-orbit"]);
  });

  it("says so when nothing matches", () => {
    const text = formatModelsText(demoModels(), META, {
      ...MODELS_OPTIONS,
      filters: { ...initialFilters, creator: "nobody" },
    });
    expect(text).toMatch(/^no models match the filters\n/);
    expect(text).toContain("Data: Artificial Analysis");
  });

  it("reports live data freshness in the footer", () => {
    const text = formatModelsText(
      demoModels(),
      { source: "cache", indexVersion: 4.1, updatedAt: "2026-11-27T10:00:00.000Z", stale: true },
      { ...MODELS_OPTIONS, top: 1 },
    );
    expect(text).toContain("updated 2026-11-27T10:00:00.000Z · stale cache");
  });
});

describe("aaplot plot", () => {
  it("matches the golden braille chart", () => {
    golden("plot.txt", formatPlotText(demoModels(), META, PLOT_OPTIONS));
  });

  it("matches the golden ascii chart", () => {
    golden("plot-ascii.txt", formatPlotText(demoModels(), META, { ...PLOT_OPTIONS, ascii: true }));
  });

  it("matches the golden JSON", () => {
    golden("plot.json", formatPlotJson(demoModels(), META, PLOT_OPTIONS));
  });

  it("emits no ANSI escapes unless color is on", () => {
    const plain = formatPlotText(demoModels(), META, PLOT_OPTIONS);
    expect(plain).not.toContain("\u001b[");
    const colored = formatPlotText(demoModels(), META, { ...PLOT_OPTIONS, color: true });
    expect(colored).toContain("\u001b[");
    expect(stripAnsi(colored).split("\n").length).toBe(plain.split("\n").length);
  });

  it("fits the whole legend by default", () => {
    expect(formatPlotText(demoModels(), META, PLOT_OPTIONS)).not.toContain("more");
  });

  it("honours axes and --top in JSON", () => {
    const parsed = JSON.parse(
      formatPlotJson(demoModels(), META, {
        ...PLOT_OPTIONS,
        y: "speed",
        x: "output_price",
        top: 4,
      }),
    ) as { plotted: number; y_label: string; x_label: string; points: Array<{ quadrant: string }> };
    expect(parsed.plotted).toBe(4);
    expect(parsed.y_label).toBe("speed (tok/s)");
    expect(parsed.x_label).toBe("$/1M output tokens");
    for (const point of parsed.points) {
      expect(point.quadrant).toMatch(/^(cheap|pricey) \+ (fast|slow)$/);
    }
  });
});

describe("aaplot compare", () => {
  it("matches the golden text table", () => {
    golden("compare.txt", formatCompareText(demoModels(), META, COMPARE_SLUGS));
  });

  it("matches the golden JSON", () => {
    golden("compare.json", formatCompareJson(demoModels(), META, COMPARE_SLUGS));
  });

  it("lists unknown slugs once", () => {
    expect(missingCompareSlugs(demoModels(), ["kestrel-1", "nope", "nope", "gone"])).toEqual([
      "nope",
      "gone",
    ]);
  });
});
