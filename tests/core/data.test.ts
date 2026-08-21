import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type FreeModelsResult } from "../../src/api/client.js";
import { demoModelsResponse } from "../../src/api/demo.js";
import { FileCache } from "../../src/core/cache.js";
import { DataService } from "../../src/core/data.js";
import { FREE_MODELS_PATH } from "../../src/api/schemas.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-data-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function makeFetchMock(response: Response): typeof fetch {
  const fetchFn = vi.fn(async () => response);
  return fetchFn as unknown as typeof fetch;
}

function makeService(
  fetchFn: typeof fetch,
  options: { offline: boolean } = { offline: false },
): { service: DataService; fetchMock: typeof fetch } {
  const client = new ApiClient({
    apiKey: "test-key",
    baseUrl: "https://api.example.test/v2",
    fetchFn,
    sleepFn: async () => {},
  });
  const service = new DataService({
    apiKey: "test-key",
    cache: new FileCache(dir),
    client,
    offline: options.offline,
  });
  return { service, fetchMock: fetchFn };
}

function apiResponse(): Response {
  return new Response(JSON.stringify(demoModelsResponse()), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "97",
      "X-RateLimit-Reset": "1753000000",
    },
  });
}

const SNAPSHOT: FreeModelsResult = {
  tier: "free",
  intelligenceIndexVersion: 4.1,
  models: demoModelsResponse().data,
  pagination: { page: 1, page_size: 200, total_pages: 1, has_more: false },
  rateLimit: { limit: 100, remaining: 97, reset: 1753000000 },
};

describe("DataService.loadModels", () => {
  it("serves a fresh cache entry without hitting the network", async () => {
    const cache = new FileCache(dir);
    await cache.set(FREE_MODELS_PATH, SNAPSHOT, SNAPSHOT.rateLimit);
    const fetchFn = makeFetchMock(apiResponse());
    const service = new DataService({ apiKey: "test-key", cache, client: new ApiClient({ apiKey: "test-key", fetchFn, sleepFn: async () => {} }) });

    const snapshot = await service.loadModels();

    expect(snapshot.fromCache).toBe(true);
    expect(snapshot.stale).toBe(false);
    expect(snapshot.models).toHaveLength(34);
    expect(snapshot.rateLimit).toEqual({ limit: 100, remaining: 97, reset: 1753000000 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches when the cache is stale and stores the result", async () => {
    let time = 0;
    const cache = new FileCache(dir, { ttlMs: 1000, now: () => time });
    const first = new DataService({
      apiKey: "test-key",
      cache,
      client: new ApiClient({
        apiKey: "test-key",
        fetchFn: makeFetchMock(apiResponse()),
        sleepFn: async () => {},
      }),
    });

    const firstSnapshot = await first.loadModels();
    expect(firstSnapshot.fromCache).toBe(false);

    time = 2000;
    const fetchFn = makeFetchMock(apiResponse());
    const second = new DataService({
      apiKey: "test-key",
      cache,
      client: new ApiClient({ apiKey: "test-key", fetchFn, sleepFn: async () => {} }),
    });

    const secondSnapshot = await second.loadModels();
    expect(secondSnapshot.fromCache).toBe(false);
    expect(secondSnapshot.stale).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("falls back to stale cache when the fetch fails", async () => {
    let time = 0;
    const cache = new FileCache(dir, { ttlMs: 1000, now: () => time });
    const prime = new DataService({
      apiKey: "test-key",
      cache,
      client: new ApiClient({
        apiKey: "test-key",
        fetchFn: makeFetchMock(apiResponse()),
        sleepFn: async () => {},
      }),
    });
    await prime.loadModels();
    time = 2000;

    const failingFetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const service = new DataService({
      apiKey: "test-key",
      cache,
      client: new ApiClient({ apiKey: "test-key", fetchFn: failingFetch, sleepFn: async () => {}, maxRetries: 0 }),
    });

    const snapshot = await service.loadModels();

    expect(snapshot.fromCache).toBe(true);
    expect(snapshot.stale).toBe(true);
    expect(snapshot.models).toHaveLength(34);
  });

  it("throws when the fetch fails and there is no cache", async () => {
    const failingFetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const { service } = makeService(failingFetch);

    await expect(service.loadModels()).rejects.toMatchObject({ kind: "network" });
  });

  it("never touches the network in offline mode", async () => {
    const fetchFn = makeFetchMock(apiResponse());
    const { service } = makeService(fetchFn, { offline: true });

    await expect(service.loadModels()).rejects.toBeInstanceOf(ApiError);

    let time = 0;
    const cache = new FileCache(dir, { ttlMs: 1000, now: () => time });
    await cache.set(FREE_MODELS_PATH, SNAPSHOT, SNAPSHOT.rateLimit);
    time = 2000;
    const serviceWithCache = new DataService({
      apiKey: "test-key",
      cache,
      offline: true,
      client: new ApiClient({ apiKey: "test-key", fetchFn, sleepFn: async () => {} }),
    });

    const snapshot = await serviceWithCache.loadModels();
    expect(snapshot.fromCache).toBe(true);
    expect(snapshot.stale).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("serves stale cache instead of burning quota when remaining is zero", async () => {
    let time = 0;
    const cache = new FileCache(dir, { ttlMs: 1000, now: () => time });
    const exhausted = { ...SNAPSHOT, rateLimit: { limit: 100, remaining: 0, reset: 1753000000 } };
    await cache.set(FREE_MODELS_PATH, exhausted, exhausted.rateLimit);
    time = 2000;

    const fetchFn = makeFetchMock(apiResponse());
    const service = new DataService({
      apiKey: "test-key",
      cache,
      client: new ApiClient({ apiKey: "test-key", fetchFn, sleepFn: async () => {} }),
    });

    const snapshot = await service.loadModels();

    expect(snapshot.stale).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
