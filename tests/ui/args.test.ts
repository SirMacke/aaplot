import { describe, expect, it } from "vitest";
import { parseArgs, shouldUseAscii } from "../../src/ui/args.js";

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
      help: false,
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
