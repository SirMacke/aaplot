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

const Y_AXES = ["intelligence", "coding", "agentic", "speed"] as const;
const X_AXES = ["index_run_cost", "output_price"] as const;
const SWEEP_TOPS = [3, 5, 10, 25];
const SWEEP_HEIGHTS = [null, 6, 8, 12, 16, 20];
const SWEEP_WIDTH = 60;
const LEGEND_GAP_WIDTH = 4;

/** Checks a piped (colourless) plot: no escape remnants, every marker drawn, layout intact. */
function checkPipedPlot(text: string, height: number | null): void {
  expect(text).not.toContain("\u001b");
  expect(text).not.toMatch(/\[[0-9;]*m/);

  const lines = text.split("\n");
  const top = lines.findIndex((line) => line.includes("┌"));
  const bottom = lines.findIndex((line, index) => index > top && /^\s+[└┴]/.test(line));
  expect(top).toBeGreaterThan(-1);
  const start = lines[top]!.indexOf("┌");
  expect(lines[top]!.slice(start)).toMatch(
    new RegExp(`^┌─{${SWEEP_WIDTH}}┐( {${LEGEND_GAP_WIDTH}}# |$)`),
  );
  // An x tick may sit on either end of the bottom border, so its corners can be ┴.
  expect(lines[bottom]!.slice(0, start).trim()).toBe("");
  expect(lines[bottom]!.slice(start)).toMatch(/^[└┴][─┴]*[┘┴]$/);

  const rows = lines.slice(top + 1, bottom);
  if (height !== null) expect(rows).toHaveLength(height);
  const plotted = Number(/^n=(\d+)\//m.exec(text)?.[1]);
  const canvasLetters: string[] = [];
  const legendLetters: string[] = [];
  const legendCol = start + SWEEP_WIDTH + LEGEND_GAP_WIDTH;
  for (const row of rows) {
    const canvas = row.slice(start, start + SWEEP_WIDTH);
    expect(canvas).not.toContain("★");
    canvasLetters.push(...(canvas.match(/[A-Z]/g) ?? []));
    const rest = row.slice(start + SWEEP_WIDTH);
    if (rest.trim() === "") continue;
    // The legend starts in the same column on every row: nothing shifted it.
    expect(rest.slice(0, LEGEND_GAP_WIDTH)).toBe(" ".repeat(LEGEND_GAP_WIDTH));
    const legend = row.slice(legendCol);
    if (legend.startsWith("… ")) continue; // "… ↓n more" paging hint
    const entry = /^[★ ]([A-Z]) /.exec(legend);
    expect(entry, row).not.toBeNull();
    legendLetters.push(entry![1]!);
  }
  expect(new Set(canvasLetters).size).toBe(canvasLetters.length);
  expect(canvasLetters).toHaveLength(plotted);
  for (const letter of legendLetters) expect(canvasLetters).toContain(letter);
}

describe("aaplot plot piped output", () => {
  for (const ascii of [false, true]) {
    for (const y of Y_AXES) {
      for (const x of X_AXES) {
        it(`stays intact for ${ascii ? "ascii" : "braille"} ${y} vs ${x} across --top/--height`, () => {
          for (const top of SWEEP_TOPS) {
            for (const height of SWEEP_HEIGHTS) {
              const text = formatPlotText(demoModels(), META, {
                ...PLOT_OPTIONS,
                ascii,
                y,
                x,
                top,
                height,
                width: SWEEP_WIDTH,
              });
              checkPipedPlot(text, height);
            }
          }
        });
      }
    }
  }
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
