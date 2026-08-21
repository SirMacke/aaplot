import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoModels } from "../../src/api/demo.js";
import { median } from "../../src/core/metrics.js";
import {
  modelsToPoints,
  quadrantStats,
  renderModelsQuadrant,
  renderQuadrant,
  renderQuadrantDetailed,
} from "../../src/render/plot.js";
import type { FreeModel } from "../../src/api/schemas.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

const BRAILLE_FIXTURE = path.join(fixturesDir, "plot-quadrant-braille.txt");
const ASCII_FIXTURE = path.join(fixturesDir, "plot-quadrant-ascii.txt");

function golden(fixturePath: string, actual: string): void {
  if (process.env.UPDATE_GOLDEN === "1") {
    writeFileSync(fixturePath, actual);
  }
  expect(actual).toBe(readFileSync(fixturePath, "utf8"));
}

function withoutOutputPrice(model: FreeModel): FreeModel {
  return {
    ...model,
    pricing: { ...model.pricing, price_1m_output_tokens: null },
  };
}

describe("renderModelsQuadrant", () => {
  it("matches the golden braille output for the demo dataset", () => {
    const text = renderModelsQuadrant(demoModels(), {
      width: 60,
      height: 24,
      top: 25,
      sortBy: "intelligence",
    });
    golden(BRAILLE_FIXTURE, text);
  });

  it("matches the golden ascii output for the demo dataset", () => {
    const text = renderModelsQuadrant(demoModels(), {
      width: 60,
      height: 24,
      top: 25,
      sortBy: "intelligence",
      ascii: true,
    });
    golden(ASCII_FIXTURE, text);
  });

  it("uses only ascii characters in ascii mode", () => {
    const text = renderModelsQuadrant(demoModels(), { ascii: true, top: 10, width: 40, height: 12 });
    expect(text).not.toMatch(/[\u2800-\u28ff]/);
    expect(text).toMatch(/[A-Z]/);
  });

  it("uses braille characters in braille mode", () => {
    const text = renderModelsQuadrant(demoModels(), { top: 10, width: 40, height: 12 });
    expect(text).toMatch(/[\u2800-\u28ff]/);
  });

  it("renders corner labels and a stats line", () => {
    const text = renderModelsQuadrant(demoModels(), { top: 10, width: 50, height: 14 });
    expect(text).toContain("cheap + smart");
    expect(text).toContain("pricey + smart");
    expect(text).toContain("cheap + weaker");
    expect(text).toContain("pricey + weaker");
    expect(text).toContain("median $/1M output tokens:");
  });

  it("supports the speed y-axis", () => {
    const text = renderModelsQuadrant(demoModels(), { y: "speed", top: 10, width: 40, height: 12 });
    expect(text).toContain("speed (tok/s)");
    expect(text).toContain("cheap + fast");
  });

  it("highlights outstanding models in the legend", () => {
    const text = renderModelsQuadrant(demoModels(), {
      top: 10,
      width: 40,
      height: 12,
      colorize: true,
    });
    expect(text).toContain("★");
    expect(text).toContain("outstanding");
  });

  it("colorizes markers by creator when enabled", () => {
    const text = renderModelsQuadrant(demoModels(), {
      top: 5,
      width: 40,
      height: 12,
      colorize: true,
    });
    expect(text).toMatch(/\x1b\[1;38;(5;|2;)/);
    expect(text).toContain("\x1b[0m");
  });
});

describe("modelsToPoints", () => {
  it("selects the top N by the requested sort and counts omitted models", () => {
    const models = demoModels();
    const info = modelsToPoints(models, { top: 25, sortBy: "intelligence" });
    expect(info.total).toBe(34);
    expect(info.plotted).toBe(25);
    expect(info.omitted).toBe(0);

    const broken = [...models, withoutOutputPrice(models[0] as FreeModel)];
    const brokenInfo = modelsToPoints(broken, { top: 25, sortBy: "intelligence" });
    expect(brokenInfo.omitted).toBe(1);
  });

  it("sorts by the value metric by default", () => {
    const info = modelsToPoints(demoModels(), { top: 5 });
    expect(info.points.length).toBe(5);
    const prices = info.points.map((point) => point.x);
    const maxPrice = Math.max(...prices);
    expect(maxPrice).toBeLessThan(2);
  });

  it("keeps point labels unique", () => {
    const info = modelsToPoints(demoModels(), { top: 25 });
    const labels = new Set(info.points.map((point) => point.label));
    expect(labels.size).toBe(25);
  });

  it("selects pinned models before auto-filling the remainder", () => {
    const models = demoModels();
    const pinned = modelsToPoints(models, {
      top: 5,
      sortBy: "intelligence",
      pinSlugs: ["kestrel-flash", "halcyon-s"],
      pinFill: true,
    });
    expect(pinned.points.map((point) => point.label).slice(0, 2)).toEqual([
      "kestrel-flash",
      "halcyon-s",
    ]);
    expect(pinned.plotted).toBe(5);
  });

  it("plots only pinned models when fill is disabled", () => {
    const models = demoModels();
    const pinnedOnly = modelsToPoints(models, {
      top: 25,
      pinSlugs: ["kestrel-flash", "halcyon-s"],
      pinFill: false,
    });
    expect(pinnedOnly.points.map((point) => point.label)).toEqual(["kestrel-flash", "halcyon-s"]);
  });

  it("carries creator names for plot coloring", () => {
    const info = modelsToPoints(demoModels(), { top: 3 });
    expect(info.points.every((point) => typeof point.creator === "string")).toBe(true);
  });
});

describe("renderQuadrant", () => {
  it("computes medians over the plotted points", () => {
    const points = demoModels()
      .map((model) => ({
        label: model.slug,
        x: model.pricing.price_1m_output_tokens ?? 0,
        y: model.evaluations.artificial_analysis_intelligence_index ?? 0,
      }))
      .slice(0, 10);
    const stats = quadrantStats(points, { logX: true });
    expect(stats.medianX).toBe(median(points.map((point) => point.x)));
    expect(stats.medianY).toBe(median(points.map((point) => point.y)));
  });

  it("places one marker per point", () => {
    const points = demoModels().slice(0, 12).map((model) => ({
      label: model.slug,
      x: model.pricing.price_1m_output_tokens ?? 0,
      y: model.evaluations.artificial_analysis_intelligence_index ?? 0,
    }));
    const result = renderQuadrantDetailed(points, { width: 50, height: 16 });
    expect(result.placed).toHaveLength(12);
    expect(result.plotted).toBe(12);
  });

  it("returns a placeholder when nothing is plottable", () => {
    expect(renderQuadrant([], {})).toBe("(no plottable points)");
  });
});
