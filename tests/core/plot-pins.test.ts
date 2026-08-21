import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_PLOT_PINS,
  PlotPinStore,
  normalizePlotPins,
  togglePlotPin,
} from "../../src/core/plot-pins.js";

describe("plot pin helpers", () => {
  it("toggles slugs and enforces the pin limit", () => {
    expect(togglePlotPin(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePlotPin(["a", "b"], "a")).toEqual(["b"]);
    const many = Array.from({ length: MAX_PLOT_PINS }, (_, index) => `m-${index}`);
    expect(togglePlotPin(many, "new")).toHaveLength(MAX_PLOT_PINS);
  });

  it("deduplicates pins while preserving order", () => {
    expect(normalizePlotPins(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("PlotPinStore", () => {
  it("persists pins and presets in the config directory", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-pins-"));
    try {
      const store = new PlotPinStore(dir);
      await store.writePins({
        slugs: ["kestrel-flash", "halcyon-s"],
        yField: "coding",
        savedAt: "2026-08-21T00:00:00.000Z",
      });
      const pins = await store.readPins();
      expect(pins?.slugs).toEqual(["kestrel-flash", "halcyon-s"]);
      expect(pins?.yField).toBe("coding");

      await store.writePresets({
        frontier: { slugs: ["kestrel-flash"], y: "intelligence" },
      });
      const presets = await store.readPresets();
      expect(presets.frontier?.slugs).toEqual(["kestrel-flash"]);

      const rawPins = await readFile(path.join(dir, "plot-pins.json"), "utf8");
      expect(rawPins).toContain("kestrel-flash");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
