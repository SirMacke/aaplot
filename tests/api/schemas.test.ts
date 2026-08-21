import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FREE_MODELS_PATH,
  apiErrorSchema,
  arenaResponseSchema,
  freeModelSchema,
  freeModelsResponseSchema,
  mediaArenaPaths,
  rateLimitSchema,
} from "../../src/api/schemas.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8")) as unknown;
}

describe("freeModelsResponseSchema", () => {
  it("parses the recorded free models page", () => {
    const parsed = freeModelsResponseSchema.safeParse(fixture("free-models-page1.json"));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tier).toBe("free");
    expect(parsed.data.intelligence_index_version).toBe(4.1);
    expect(parsed.data.pagination.has_more).toBe(true);
    expect(parsed.data.data).toHaveLength(3);
    expect(parsed.data.data[0]?.slug).toBe("kestrel-1");
  });

  it("accepts sparse real-world shapes with missing nullable fields", () => {
    const parsed = freeModelSchema.safeParse({
      id: "m1",
      name: "Example",
      slug: "example",
      model_creator: { id: "c1", name: "Creator", slug: "creator" },
      evaluations: {
        artificial_analysis_intelligence_index: 50,
        mmlu_pro: 0.81,
      },
      artificial_analysis_intelligence_index_cost: { total_cost: 12.5 },
      pricing: {
        price_1m_input_tokens: 1,
        price_1m_output_tokens: 3,
        price_1m_blended_3_to_1: 2.5,
      },
      performance: {
        median_output_tokens_per_second: 120,
      },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.evaluations.artificial_analysis_coding_index).toBeNull();
    expect(parsed.data.performance.median_time_to_first_token_seconds).toBeNull();
    expect(parsed.data.release_date).toBeNull();
  });

  it("accepts null nested objects from the live API", () => {
    const parsed = freeModelSchema.safeParse({
      id: "m2",
      name: "Unmeasured",
      slug: "unmeasured",
      model_creator: { id: "c1", name: "Creator" },
      evaluations: null,
      artificial_analysis_intelligence_index_cost: null,
      pricing: null,
      performance: null,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.artificial_analysis_intelligence_index_cost.total_cost).toBeNull();
    expect(parsed.data.evaluations.artificial_analysis_intelligence_index).toBeNull();
    expect(parsed.data.pricing.price_1m_output_tokens).toBeNull();
  });

  it("coerces string intelligence index versions", () => {
    const body = fixture("free-models-page1.json") as Record<string, unknown>;
    const parsed = freeModelsResponseSchema.safeParse({
      ...body,
      intelligence_index_version: "4.1",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.intelligence_index_version).toBe(4.1);
  });

  it("accepts null release dates and missing cache pricing", () => {
    const body = fixture("free-models-page1.json") as {
      data: Array<{ slug: string; release_date: unknown; pricing: { slug: string } }>;
    };
    const model = body.data.find((entry) => entry.slug === "nimbus-mini-3");
    const parsed = freeModelSchema.safeParse(model);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.release_date).toBeNull();
    expect(parsed.data.pricing.price_1m_cache_hit_tokens).toBeNull();
  });

  it("rejects a non-string release date", () => {
    const body = fixture("free-models-page1.json") as { data: unknown[] };
    const [model] = body.data;
    const broken = { ...(model as Record<string, unknown>), release_date: 2026 };
    expect(freeModelSchema.safeParse(broken).success).toBe(false);
  });

  it("fills in empty pricing when the field is missing", () => {
    const body = fixture("free-models-page1.json") as { data: unknown[] };
    const [model] = body.data;
    const { pricing: _pricing, ...rest } = model as Record<string, unknown>;
    void _pricing;
    const parsed = freeModelSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.pricing.price_1m_output_tokens).toBeNull();
  });
});

describe("arenaResponseSchema", () => {
  it("parses the recorded TTS arena response", () => {
    const parsed = arenaResponseSchema.safeParse(fixture("arena-tts-free.json"));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tier).toBe("free");
    expect(parsed.data.data).toHaveLength(3);
    expect(parsed.data.data[2]?.elo).toBe(1102);
    expect(parsed.data.data[2]?.ci_95).toBeNull();
  });
});

describe("supporting schemas", () => {
  it("parses API error bodies", () => {
    const parsed = apiErrorSchema.safeParse({ error: "quota exceeded", details: { retry: "later" } });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.error).toBe("quota exceeded");
  });

  it("parses rate limit values", () => {
    const parsed = rateLimitSchema.safeParse({ limit: 100, remaining: 97, reset: 1753000000 });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.remaining).toBe(97);
  });

  it("rejects negative rate limit counts", () => {
    expect(rateLimitSchema.safeParse({ limit: 100, remaining: -1, reset: 1753000000 }).success).toBe(false);
  });
});

describe("endpoint paths", () => {
  it("points the free tier at the free models endpoint", () => {
    expect(FREE_MODELS_PATH).toBe("/language/models/free");
  });

  it("maps every media arena to a free endpoint", () => {
    const kinds = Object.keys(mediaArenaPaths);
    expect(kinds).toHaveLength(6);
    for (const path of Object.values(mediaArenaPaths)) {
      expect(path.endsWith("/free")).toBe(true);
    }
  });
});
