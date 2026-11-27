import { describe, expect, it } from "vitest";
import { parseArgs, shouldUseAscii } from "../../src/ui/args.js";

describe("parseArgs", () => {
  it("defaults everything off", () => {
    expect(parseArgs([])).toEqual({
      command: "tui",
      demo: false,
      ascii: false,
      offline: false,
      creator: null,
      minQuality: null,
      maxCost: null,
      cheap: false,
      help: false,
      json: false,
      slugs: [],
      sort: null,
      plotSort: null,
      top: null,
      y: null,
      x: null,
      width: null,
      height: null,
      error: null,
    });
  });

  it("parses boolean flags", () => {
    const args = parseArgs(["--demo", "--ascii", "--offline", "--cheap", "--help"]);
    expect(args.demo).toBe(true);
    expect(args.ascii).toBe(true);
    expect(args.offline).toBe(true);
    expect(args.cheap).toBe(true);
    expect(args.help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
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

describe("parseArgs one-shot commands", () => {
  it("parses models with --json, --sort and --top", () => {
    const args = parseArgs(["models", "--json", "--sort", "intel", "--top", "5", "--demo"]);
    expect(args.command).toBe("models");
    expect(args.json).toBe(true);
    expect(args.sort).toBe("intel");
    expect(args.top).toBe(5);
    expect(args.error).toBeNull();
  });

  it("parses plot axes, sort and canvas size", () => {
    const args = parseArgs([
      "plot",
      "--y",
      "coding",
      "--x",
      "output-price",
      "--sort",
      "value",
      "--width",
      "80",
      "--height",
      "30",
    ]);
    expect(args.command).toBe("plot");
    expect(args.y).toBe("coding");
    expect(args.x).toBe("output_price");
    expect(args.plotSort).toBe("value");
    expect(args.sort).toBeNull();
    expect(args.width).toBe(80);
    expect(args.height).toBe(30);
    expect(args.error).toBeNull();
  });

  it("collects compare slugs in order", () => {
    const args = parseArgs(["compare", "kestrel-1", "--json", "nimbus-omni"]);
    expect(args.command).toBe("compare");
    expect(args.slugs).toEqual(["kestrel-1", "nimbus-omni"]);
    expect(args.json).toBe(true);
    expect(args.error).toBeNull();
  });

  it("reports usage errors", () => {
    expect(parseArgs(["frobnicate"]).error).toBe("unknown command frobnicate");
    expect(parseArgs(["--json"]).error).toMatch(/needs a command/);
    expect(parseArgs(["compare"]).error).toMatch(/at least one model slug/);
    expect(parseArgs(["models", "--sort", "intelligence"]).error).toMatch(/--sort must be one of/);
    expect(parseArgs(["plot", "--sort", "intel"]).error).toMatch(/--sort must be one of/);
    expect(parseArgs(["plot", "--y", "vibes"]).error).toMatch(/--y must be one of/);
    expect(parseArgs(["plot", "--x", "free"]).error).toMatch(/--x must be one of/);
    expect(parseArgs(["models", "--top", "0"]).error).toMatch(/positive integer/);
    expect(parseArgs(["models", "extra"]).error).toBe("unexpected argument extra");
    expect(parseArgs(["--bogus"]).error).toBe("unknown option --bogus");
    expect(parseArgs(["compare", "--help"]).error).toBeNull();
  });
});

describe("shouldUseAscii", () => {
  it("honors --ascii on every platform", () => {
    expect(shouldUseAscii(true, { WT_SESSION: "1", TERM_PROGRAM: "vscode" }, "win32")).toBe(true);
    expect(shouldUseAscii(true, { TERM: "xterm-256color" }, "linux")).toBe(true);
  });

  it("uses ASCII on TERM=dumb", () => {
    expect(shouldUseAscii(false, { TERM: "dumb" }, "linux")).toBe(true);
  });

  it("uses braille in Windows Terminal and VS Code", () => {
    expect(shouldUseAscii(false, { WT_SESSION: "1" }, "win32")).toBe(false);
    expect(shouldUseAscii(false, { TERM_PROGRAM: "vscode" }, "win32")).toBe(false);
  });

  it("uses ASCII on other Windows consoles", () => {
    expect(shouldUseAscii(false, { TERM: "xterm-256color" }, "win32")).toBe(true);
  });

  it("uses braille on Unix terminals that are not dumb", () => {
    expect(shouldUseAscii(false, { TERM: "xterm-256color" }, "linux")).toBe(false);
    expect(shouldUseAscii(false, { TERM: "xterm-256color" }, "darwin")).toBe(false);
  });
});
