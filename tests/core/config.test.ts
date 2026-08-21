import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KeyStore } from "../../src/core/config.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-config-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("KeyStore", () => {
  it("returns null when no key is configured", async () => {
    const store = new KeyStore(dir, {});
    expect(await store.read()).toBeNull();
  });

  it("writes and reads the API key back", async () => {
    const store = new KeyStore(dir, {});
    await store.write("secret-key-123");
    expect(await store.read()).toBe("secret-key-123");
  });

  it("prefers the AA_API_KEY environment variable over the file", async () => {
    const store = new KeyStore(dir, { AA_API_KEY: "env-key" });
    await store.write("file-key");
    expect(await store.read()).toBe("env-key");
  });

  it("falls back to the file when the env var is empty", async () => {
    const store = new KeyStore(dir, { AA_API_KEY: "" });
    await store.write("file-key");
    expect(await store.read()).toBe("file-key");
  });

  it("clears a stored key", async () => {
    const store = new KeyStore(dir, {});
    await store.write("secret-key-123");
    await store.clear();
    expect(await store.read()).toBeNull();
  });

  it.skipIf(process.platform === "win32")("writes the config file with 0600 permissions", async () => {
    const store = new KeyStore(dir, {});
    await store.write("secret-key-123");
    const fileStat = await stat(path.join(dir, "config.json"));
    expect(fileStat.mode & 0o777).toBe(0o600);
  });
});
