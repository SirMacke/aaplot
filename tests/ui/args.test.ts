import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/ui/args.js";

describe("parseArgs", () => {
  it("defaults everything off", () => {
    expect(parseArgs([])).toEqual({
      demo: false,
      ascii: false,
      offline: false,
      creator: null,
      minQuality: null,
      maxCost: null,
      cheap: false,
    });
  });

  it("parses boolean flags", () => {
    const args = parseArgs(["--demo", "--ascii", "--offline", "--cheap"]);
    expect(args.demo).toBe(true);
    expect(args.ascii).toBe(true);
    expect(args.offline).toBe(true);
    expect(args.cheap).toBe(true);
  });

  it("parses value flags", () => {
    const args = parseArgs(["--creator", "openai", "--min-quality", "60", "--max-cost", "2.5"]);
    expect(args.creator).toBe("openai");
    expect(args.minQuality).toBe(60);
    expect(args.maxCost).toBe(2.5);
  });

  it("ignores malformed numeric values", () => {
    const args = parseArgs(["--min-quality", "abc", "--max-cost"]);
    expect(args.minQuality).toBeNull();
    expect(args.maxCost).toBeNull();
  });
});
