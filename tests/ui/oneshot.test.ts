import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/api/client.js";
import { demoModelsResponse } from "../../src/api/demo.js";
import { FileCache } from "../../src/core/cache.js";
import { KeyStore } from "../../src/core/config.js";
import { DataService } from "../../src/core/data.js";
import { parseArgs } from "../../src/ui/args.js";
import { runOneShot, type OneShotIo } from "../../src/ui/oneshot.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-oneshot-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function capture(overrides: Partial<OneShotIo> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: OneShotIo = {
    stdout: { write: (text: string) => out.push(text), isTTY: false },
    stderr: { write: (text: string) => err.push(text) },
    env: {},
    platform: "linux",
    keyStore: new KeyStore(path.join(dir, "config"), {}),
    ...overrides,
  };
  return { io, out: () => out.join(""), err: () => err.join("") };
}

function liveService(offline: boolean, fetchFn: typeof fetch): DataService {
  return new DataService({
    apiKey: "test-key",
    cache: new FileCache(path.join(dir, "cache")),
    offline,
    client: new ApiClient({
      apiKey: "test-key",
      baseUrl: "https://api.example.test/v2",
      fetchFn,
      sleepFn: async () => {},
    }),
  });
}

function okFetch(): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(demoModelsResponse()), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "97",
          "X-RateLimit-Reset": "1753000000",
        },
      }),
  ) as unknown as typeof fetch;
}

describe("runOneShot", () => {
  it("prints demo models JSON without touching the key store", async () => {
    const { io, out, err } = capture();
    const code = await runOneShot(parseArgs(["models", "--demo", "--json", "--top", "3"]), io);
    expect(code).toBe(0);
    expect(err()).toBe("");
    const parsed = JSON.parse(out()) as { source: string; count: number };
    expect(parsed.source).toBe("demo");
    expect(parsed.count).toBe(3);
  });

  it("fails with a hint when there is no API key", async () => {
    const { io, out, err } = capture();
    const code = await runOneShot(parseArgs(["models"]), io);
    expect(code).toBe(1);
    expect(out()).toBe("");
    expect(err()).toMatch(/no API key — set AA_API_KEY/);
  });

  it("loads live data through the cache and stamps the fetch time", async () => {
    const fetchFn = okFetch();
    const { io, out } = capture({
      env: { AA_API_KEY: "test-key" },
      keyStore: new KeyStore(path.join(dir, "config"), { AA_API_KEY: "test-key" }),
      serviceFactory: (_key, offline) => liveService(offline, fetchFn),
    });
    const code = await runOneShot(parseArgs(["plot", "--json", "--top", "5"]), io);
    expect(code).toBe(0);
    const parsed = JSON.parse(out()) as { source: string; updated_at: string; plotted: number };
    expect(parsed.source).toBe("live");
    expect(Number.isNaN(Date.parse(parsed.updated_at))).toBe(false);
    expect(parsed.plotted).toBe(5);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("reports offline mode with an empty cache", async () => {
    const fetchFn = okFetch();
    const { io, err } = capture({
      keyStore: new KeyStore(path.join(dir, "config"), { AA_API_KEY: "test-key" }),
      serviceFactory: (_key, offline) => liveService(offline, fetchFn),
    });
    const code = await runOneShot(parseArgs(["models", "--offline"]), io);
    expect(code).toBe(1);
    expect(err()).toMatch(/no network and no cached data/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects unknown compare slugs", async () => {
    const { io, out, err } = capture();
    const code = await runOneShot(parseArgs(["compare", "--demo", "kestrel-1", "nope"]), io);
    expect(code).toBe(1);
    expect(out()).toBe("");
    expect(err()).toContain("unknown model slug: nope");
  });

  it("colors the plot only on a TTY without NO_COLOR", async () => {
    const run = async (env: NodeJS.ProcessEnv, isTTY: boolean) => {
      const chunks: string[] = [];
      const { io } = capture({
        env,
        stdout: { write: (text: string) => chunks.push(text), isTTY },
      });
      await runOneShot(parseArgs(["plot", "--demo"]), io);
      return chunks.join("");
    };
    expect(await run({}, true)).toContain("\u001b[");
    expect(await run({ NO_COLOR: "1" }, true)).not.toContain("\u001b[");
    expect(await run({}, false)).not.toContain("\u001b[");
  });
});
