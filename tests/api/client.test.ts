import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type ApiClientOptions } from "../../src/api/client.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

const page1 = readFileSync(path.join(fixturesDir, "free-models-page1.json"), "utf8");
const page2 = readFileSync(path.join(fixturesDir, "free-models-page2.json"), "utf8");
const ttsArena = readFileSync(path.join(fixturesDir, "arena-tts-free.json"), "utf8");

const RATE_LIMIT_HEADERS: Record<string, string> = {
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "97",
  "X-RateLimit-Reset": "1753000000",
  "X-AA-Tier": "free",
};

function jsonResponse(
  body: string,
  status = 200,
  headers: Record<string, string> = RATE_LIMIT_HEADERS,
): Response {
  return new Response(body, { status, headers: { "content-type": "application/json", ...headers } });
}

function makeClient(
  fetchFn: typeof fetch,
  sleepFn: (milliseconds: number) => Promise<void>,
): ApiClient {
  const options: ApiClientOptions = {
    apiKey: "test-key",
    baseUrl: "https://api.example.test/v2",
    fetchFn,
    sleepFn,
  };
  return new ApiClient(options);
}

function makeSleep() {
  return vi.fn(async (milliseconds: number) => {
    void milliseconds;
  });
}

function mockFetch(responses: Array<Response | Error>): typeof fetch {
  let call = 0;
  const fetchFn = async (): Promise<Response> => {
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (next === undefined) throw new Error("mock fetch exhausted");
    if (next instanceof Error) throw next;
    return next;
  };
  return fetchFn as unknown as typeof fetch;
}

describe("ApiClient auth", () => {
  it("sends the x-api-key header and hits the free media path without a query", async () => {
    const fetchMock = vi.fn(mockFetch([jsonResponse(ttsArena)]));
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getArena("tts");

    expect(result.entries).toHaveLength(3);
    expect(result.tier).toBe("free");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.example.test/v2/media/text-to-speech/models/free");
    expect(init?.headers).toMatchObject({ "x-api-key": "test-key" });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("ApiClient paging", () => {
  it("follows pages until has_more is false and merges the data", async () => {
    const fetchMock = vi.fn(mockFetch([jsonResponse(page1), jsonResponse(page2)]));
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getFreeModels();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [secondUrl] = fetchMock.mock.calls[1] ?? [];
    expect(String(secondUrl)).toContain("page=2");
    expect(result.models.map((model) => model.slug)).toEqual([
      "kestrel-1",
      "nimbus-mini-3",
      "quarry-8b",
      "halcyon-t",
      "bramble-3b",
      "lumen-lite",
    ]);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.has_more).toBe(false);
    expect(result.intelligenceIndexVersion).toBe(4.1);
    expect(result.tier).toBe("free");
  });

  it("captures rate limit headers from the last page", async () => {
    const fetchMock = vi.fn(mockFetch([jsonResponse(page1), jsonResponse(page2)]));
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getFreeModels();

    expect(result.rateLimit).toEqual({ limit: 100, remaining: 97, reset: 1753000000 });
  });
});

describe("ApiClient retries", () => {
  it("retries 500 responses with exponential backoff", async () => {
    const fetchMock = vi.fn(
      mockFetch([
        jsonResponse("{}", 500, {}),
        jsonResponse("{}", 500, {}),
        jsonResponse(ttsArena),
      ]),
    );
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getArena("tts");

    expect(result.entries).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000]);
  });

  it("respects Retry-After on 429 before retrying", async () => {
    const fetchMock = vi.fn(
      mockFetch([
        jsonResponse('{"error":"quota exhausted"}', 429, { ...RATE_LIMIT_HEADERS, "Retry-After": "2" }),
        jsonResponse(ttsArena),
      ]),
    );
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getArena("tts");

    expect(result.entries).toHaveLength(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([2000]);
  });

  it("retries transient network errors", async () => {
    const fetchMock = vi.fn(mockFetch([new TypeError("fetch failed"), jsonResponse(ttsArena)]));
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const result = await client.getArena("tts");

    expect(result.entries).toHaveLength(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500]);
  });

  it("gives up after maxRetries and reports the network error", async () => {
    const fetchMock = vi.fn(mockFetch([new TypeError("fetch failed")]));
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    await expect(client.getArena("tts")).rejects.toMatchObject({ kind: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("ApiClient errors", () => {
  it("throws an ApiError with the server message on 401", async () => {
    const fetchMock = vi.fn(
      mockFetch([jsonResponse('{"error":"missing or invalid api key"}', 401, {})]),
    );
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const error = await client.getArena("tts").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "http", status: 401, message: "missing or invalid api key" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("exposes Retry-After when a 429 is not retried", async () => {
    const fetchMock = vi.fn(
      mockFetch([
        jsonResponse('{"error":"quota exhausted"}', 429, { "Retry-After": "3600" }),
        jsonResponse('{"error":"quota exhausted"}', 429, { "Retry-After": "3600" }),
        jsonResponse('{"error":"quota exhausted"}', 429, { "Retry-After": "3600" }),
        jsonResponse('{"error":"quota exhausted"}', 429, { "Retry-After": "3600" }),
      ]),
    );
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const error = await client.getArena("tts").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "http", status: 429, retryAfterSeconds: 3600 });
  });

  it("throws a schema error when the response shape does not match", async () => {
    const fetchMock = vi.fn(
      mockFetch([jsonResponse('{"tier":"free","data":[{"nope":true}]}')]),
    );
    const sleep = makeSleep();
    const client = makeClient(fetchMock as unknown as typeof fetch, sleep);

    const error = await client.getArena("tts").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "schema" });
  });
});
