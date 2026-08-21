import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DAY_MS, FileCache } from "../../src/core/cache.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-cache-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileCache", () => {
  it("stores and returns data with rate limit info", async () => {
    const cache = new FileCache(dir);
    const rateLimit = { limit: 100, remaining: 97, reset: 1753000000 };

    await cache.set("models", { models: [{ slug: "kestrel-1" }] }, rateLimit);
    const cached = await cache.get<{ models: Array<{ slug: string }> }>("models");

    expect(cached).not.toBeNull();
    expect(cached?.data.models[0]?.slug).toBe("kestrel-1");
    expect(cached?.rateLimit).toEqual(rateLimit);
    expect(cached?.fresh).toBe(true);
  });

  it("marks entries past their TTL as stale but still returns them", async () => {
    let time = 0;
    const cache = new FileCache(dir, { ttlMs: 1000, now: () => time });

    await cache.set("models", { value: 1 });
    time = 1500;
    const cached = await cache.get<{ value: number }>("models");

    expect(cached).not.toBeNull();
    expect(cached?.data.value).toBe(1);
    expect(cached?.fresh).toBe(false);
  });

  it("defaults to a 24h TTL", () => {
    const cache = new FileCache(dir);
    void cache;
    expect(DAY_MS).toBe(86_400_000);
  });

  it("returns null for unknown keys", async () => {
    const cache = new FileCache(dir);
    expect(await cache.get("missing")).toBeNull();
  });

  it("returns null for a corrupted cache file", async () => {
    const cache = new FileCache(dir);
    await cache.set("models", { value: 1 });
    const files = await readdir(dir);
    const file = files[0];
    if (file === undefined) throw new Error("expected a cache file");
    await writeFile(path.join(dir, file), "{not json");

    expect(await cache.get("models")).toBeNull();
  });

  it("deletes individual entries and clears the whole cache", async () => {
    const cache = new FileCache(dir);
    await cache.set("a", { value: 1 });
    await cache.set("b", { value: 2 });

    await cache.delete("a");
    expect(await cache.get("a")).toBeNull();
    expect(await cache.get("b")).not.toBeNull();

    await cache.clear();
    expect(await cache.get("b")).toBeNull();
  });
});
