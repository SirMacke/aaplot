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

  it("accepts null release dates and missing cache pricing", () => {
    const body = fixture("free-models-page1.json") as {
      data: Array<{ slug: string; release_date: unknown; pricing: { slug: string } }>;
    };
    const model = body.data.find((entry) => entry.slug === "nimbus-mini-3");
    const parsed = freeModelSchema.safeParse(model);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.release_date).toBeNull();
    expect(parsed.data.pricing.price_1m_cache_hit_tokens).toBeUndefined();
  });

  it("rejects a non-string release date", () => {
    const body = fixture("free-models-page1.json") as { data: unknown[] };
    const [model] = body.data;
    const broken = { ...(model as Record<string, unknown>), release_date: 2026 };
    expect(freeModelSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a model without pricing", () => {
    const body = fixture("free-models-page1.json") as { data: unknown[] };
    const [model] = body.data;
    const { pricing: _pricing, ...rest } = model as Record<string, unknown>;
    void _pricing;
    expect(freeModelSchema.safeParse(rest).success).toBe(false);
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
