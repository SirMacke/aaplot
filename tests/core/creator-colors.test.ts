import { describe, expect, it } from "vitest";
import { colorizeText, creatorColorIndex, creatorSwatch } from "../../src/core/creator-colors.js";

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

  it("renders a swatch block", () => {
    expect(creatorSwatch("Meta")).toContain("\x1b[48;5;");
  });
});
