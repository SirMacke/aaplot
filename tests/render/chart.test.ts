import { describe, expect, it } from "vitest";
import { horizontalBar } from "../../src/render/chart.js";

describe("horizontalBar", () => {
  it("renders a filled bar for numeric values", () => {
    const line = horizontalBar("intel", 40, { width: 10 });
    expect(line).toContain("intel");
    expect(line).toContain("█");
    expect(line).toContain("40");
  });

  it("renders a placeholder for null values", () => {
    expect(horizontalBar("code", null)).toContain("—");
  });
});
