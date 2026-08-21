import { describe, expect, it } from "vitest";
import { demoModels, demoModelsResponse } from "../../src/api/demo.js";
import { freeModelsResponseSchema } from "../../src/api/schemas.js";

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

describe("demo dataset", () => {
  it("is a valid free models response", () => {
    const parsed = freeModelsResponseSchema.safeParse(demoModelsResponse());
    expect(parsed.success).toBe(true);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(demoModels())).toBe(JSON.stringify(demoModels()));
  });

  it("has at least 30 models with unique slugs and synthetic ids", () => {
    const models = demoModels();
    expect(models.length).toBeGreaterThanOrEqual(30);
    const slugs = new Set(models.map((model) => model.slug));
    expect(slugs.size).toBe(models.length);
    for (const model of models) {
      expect(model.id.startsWith("demo-model-")).toBe(true);
    }
  });

  it("gives every model a price, an index, and an index-run cost", () => {
    for (const model of demoModels()) {
      const price = model.pricing.price_1m_output_tokens;
      const intelligence = model.evaluations.artificial_analysis_intelligence_index;
      const cost = model.artificial_analysis_intelligence_index_cost.total_cost;
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
      expect(intelligence).not.toBeNull();
      expect(intelligence).toBeGreaterThan(0);
      expect(cost).not.toBeNull();
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("spreads models across all four cost vs intelligence quadrants", () => {
    const models = demoModels();
    const prices = models.map((model) => model.pricing.price_1m_output_tokens ?? 0);
    const indices = models.map(
      (model) => model.evaluations.artificial_analysis_intelligence_index ?? 0,
    );
    const medianPrice = medianOf(prices);
    const medianIndex = medianOf(indices);

    const counts = { cheapSmart: 0, priceySmart: 0, cheapBasic: 0, priceyBasic: 0 };
    for (const model of models) {
      const price = model.pricing.price_1m_output_tokens ?? 0;
      const index = model.evaluations.artificial_analysis_intelligence_index ?? 0;
      if (price < medianPrice && index >= medianIndex) counts.cheapSmart += 1;
      else if (price >= medianPrice && index >= medianIndex) counts.priceySmart += 1;
      else if (price < medianPrice && index < medianIndex) counts.cheapBasic += 1;
      else counts.priceyBasic += 1;
    }

    expect(counts.cheapSmart).toBeGreaterThanOrEqual(3);
    expect(counts.priceySmart).toBeGreaterThanOrEqual(3);
    expect(counts.cheapBasic).toBeGreaterThanOrEqual(3);
    expect(counts.priceyBasic).toBeGreaterThanOrEqual(3);
  });
});
