import { describe, expect, it } from "vitest";
import {
  colorizeText,
  creatorColorIndex,
  creatorRgb,
  creatorSwatch,
  terminalSupportsTruecolor,
} from "../../src/core/creator-colors.js";

describe("creator-colors", () => {
  it("maps well-known labs to stable palette entries", () => {
    expect(creatorColorIndex("OpenAI")).toBe(creatorColorIndex("openai"));
    expect(creatorColorIndex("Anthropic")).toBe(208);
    expect(creatorColorIndex("Google")).toBe(220);
  });

  it("wraps text with reset codes", () => {
    const colored = colorizeText("A", "OpenAI", true);
    expect(colored.startsWith("\x1b[")).toBe(true);
    expect(colored.endsWith("\x1b[0m")).toBe(true);
    expect(colored).toContain("A");
  });

  it("uses truecolor ANSI when the terminal supports it", () => {
    const env = { COLORTERM: "truecolor" } as NodeJS.ProcessEnv;
    expect(terminalSupportsTruecolor(env)).toBe(true);
    expect(creatorRgb("OpenAI")).toEqual([16, 163, 127]);
    const [r, g, b] = creatorRgb("Anthropic");
    expect(r).toBeGreaterThan(0);
    expect(g).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });

  it("falls back to 256-color palette on dumb terminals", () => {
    const env = { TERM: "dumb" } as NodeJS.ProcessEnv;
    expect(terminalSupportsTruecolor(env)).toBe(false);
    expect(creatorColorIndex("Anthropic")).toBe(208);
  });

  it("renders a swatch block", () => {
    expect(creatorSwatch("Meta")).toContain("\x1b[48;5;");
  });
});
