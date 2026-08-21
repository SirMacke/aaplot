import { describe, expect, it } from "vitest";
import { mediaTableLayout } from "../../src/core/media-table.js";

describe("mediaTableLayout", () => {
  it("uses fixed creator and slug widths on wide terminals", () => {
    const layout = mediaTableLayout(false);
    expect(layout.creatorWidth).toBe(14);
    expect(layout.slugWidth).toBe(22);
  });

  it("hides creator on narrow terminals", () => {
    const layout = mediaTableLayout(true);
    expect(layout.creatorWidth).toBe(0);
    expect(layout.slugWidth).toBe(16);
  });
});
