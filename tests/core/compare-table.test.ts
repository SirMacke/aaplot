import { describe, expect, it } from "vitest";
import { demoModels } from "../../src/api/demo.js";
import {
  buildCompareRows,
  clampCompareOffset,
  compareLayout,
  formatCompareTable,
  resolveCompareModels,
  winnerFlags,
} from "../../src/core/compare-table.js";

function bySlug(...slugs: string[]) {
  return resolveCompareModels(demoModels(), slugs);
}

describe("resolveCompareModels", () => {
  it("keeps pin order and skips unknown slugs", () => {
    const models = bySlug("nimbus-omni", "missing", "kestrel-1", "nimbus-omni");
    expect(models.map((model) => model.slug)).toEqual(["nimbus-omni", "kestrel-1"]);
  });
});

describe("winnerFlags", () => {
  it("marks the unique highest or lowest value", () => {
    expect(winnerFlags([10, 40, 25], "higher")).toEqual([false, true, false]);
    expect(winnerFlags([3.1, 260, 4.6], "lower")).toEqual([true, false, false]);
  });

  it("stars every tied leader when someone else loses", () => {
    expect(winnerFlags([70, 70, 40], "higher")).toEqual([true, true, false]);
  });

  it("skips highlighting when every comparable value is tied or alone", () => {
    expect(winnerFlags([0.5, 0.5, 0.5], "lower")).toEqual([false, false, false]);
    expect(winnerFlags([77.9], "higher")).toEqual([false]);
    expect(winnerFlags([null, 12], "higher")).toEqual([false, false]);
  });

  it("ignores nulls and identity rows", () => {
    expect(winnerFlags([null, 50, 80], "higher")).toEqual([false, false, true]);
    expect(winnerFlags([1, 2], null)).toEqual([false, false]);
  });
});

describe("buildCompareRows", () => {
  it("highlights the smarter, cheaper, and newer model", () => {
    const rows = buildCompareRows(bySlug("kestrel-1", "lumen-forge-x2"));
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(byId.creator?.cells.map((cell) => cell.winner)).toEqual([false, false]);
    expect(byId.intel?.cells.map((cell) => cell.winner)).toEqual([false, true]);
    expect(byId.code?.cells.map((cell) => cell.winner)).toEqual([false, true]);
    expect(byId.speed?.cells.map((cell) => cell.winner)).toEqual([true, false]);
    expect(byId.idx_cost?.cells.map((cell) => cell.winner)).toEqual([true, false]);
    expect(byId.output_price?.cells.map((cell) => cell.winner)).toEqual([true, false]);
    expect(byId.release?.cells.map((cell) => cell.winner)).toEqual([false, true]);
    expect(byId.ttft?.cells.every((cell) => !cell.winner)).toBe(true);
  });
});

describe("compareLayout", () => {
  it("packs compact columns instead of stretching to the terminal width", () => {
    expect(compareLayout(120, 2)).toEqual({ labelWidth: 10, colWidth: 16, visible: 2 });
    expect(compareLayout(120, 8)).toEqual({ labelWidth: 10, colWidth: 15, visible: 7 });
    expect(compareLayout(80, 8)).toEqual({ labelWidth: 10, colWidth: 16, visible: 4 });
    expect(compareLayout(40, 8)).toEqual({ labelWidth: 10, colWidth: 14, visible: 2 });
    expect(compareLayout(120, 0).visible).toBe(0);
  });
});

describe("clampCompareOffset", () => {
  it("keeps the window inside the pin list", () => {
    expect(clampCompareOffset(0, 6, 4)).toBe(0);
    expect(clampCompareOffset(3, 6, 4)).toBe(2);
    expect(clampCompareOffset(-1, 6, 4)).toBe(0);
    expect(clampCompareOffset(2, 3, 4)).toBe(0);
  });
});

describe("formatCompareTable", () => {
  it("renders side-by-side rows with a ★ on each metric winner", () => {
    const table = formatCompareTable(bySlug("kestrel-1", "lumen-forge-x2"), 120);
    const lines = table.split("\n");
    expect(lines[0]).toContain("kestrel-1");
    expect(lines[0]).toContain("lumen-forge-x2");
    const intel = lines.find((line) => line.startsWith("Intel"));
    expect(intel).toMatch(/Intel\s+│\s*61\.2\s+77\.9★/);
    expect(intel?.length).toBeLessThanOrEqual(10 + 1 + 16 + 16);
    expect(table).toMatch(/Speed\s+│\s*240★\s+95\s/);
    expect(table).toContain("$260");
    expect(table).toContain("Kestrel Labs");
    expect(table).toContain("Lumen Forge");
  });

  it("pages extra columns when they do not fit", () => {
    const models = bySlug("kestrel-1", "nimbus-omni", "lumen-forge-x2");
    const first = formatCompareTable(models, 40, 0);
    const second = formatCompareTable(models, 40, 1);
    expect(first).toContain("kestrel-1");
    expect(first).toContain("nimbus-omni");
    expect(first).not.toContain("lumen-forge");
    expect(second).toContain("nimbus-omni");
    expect(second).toContain("lumen-forge");
    expect(second).not.toContain("kestrel-1");
  });
});
