import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { render } from "ink-testing-library";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { demoArenas, demoModels } from "../../src/api/demo.js";
import { KeyStore } from "../../src/core/config.js";
import { DataService } from "../../src/core/data.js";
import App from "../../src/ui/app.js";
import { getState, resetState, setState } from "../../src/ui/store.js";

const mounts: Array<() => void> = [];

afterEach(() => {
  for (const unmount of mounts.splice(0)) unmount();
  resetState();
});

type FrameSource = { lastFrame: () => string | undefined };
type TestStdin = { write: (input: string) => void };
type MountResult = { stdout: FrameSource; stdin: TestStdin };

function lastFrame(stdout: FrameSource): string {
  return stdout.lastFrame() ?? "";
}

async function waitForFrame(stdout: FrameSource, needle: string): Promise<void> {
  await vi.waitFor(() => expect(lastFrame(stdout)).toContain(needle), {
    timeout: 5000,
    interval: 25,
  });
}

function mountApp(props: React.ComponentProps<typeof App>): MountResult {
  const result = render(React.createElement(App, props));
  mounts.push(result.unmount);
  return { stdout: result, stdin: result.stdin };
}

describe("App shell", () => {
  it("renders the demo shell with tab bar, model table, and footer", async () => {
    const { stdout } = mountApp({ demo: true, widthOverride: 140 });

    await waitForFrame(stdout, "Models");
    const frame = lastFrame(stdout);
    expect(frame).toContain("34/34");
    expect(frame).toContain("lumen-forge-x2");
    expect(frame).toContain("quota 96/100");
    expect(frame).toContain("artificialanalysis.ai");
    expect(frame).toContain("Plot");
    expect(frame).toContain("Media");
  });

  it("switches tabs with the tab key", async () => {
    const { stdout, stdin } = mountApp({ demo: true, widthOverride: 140 });

    await waitForFrame(stdout, "Models");
    stdin.write("\t");
    await waitForFrame(stdout, "intel vs");
  });

  it("toggles the help overlay with ?", async () => {
    const { stdout, stdin } = mountApp({ demo: true });

    await waitForFrame(stdout, "Models");
    stdin.write("?");
    await waitForFrame(stdout, "keyboard shortcuts");
    stdin.write("?");
    await vi.waitFor(() => expect(lastFrame(stdout)).not.toContain("keyboard shortcuts"), {
      timeout: 5000,
      interval: 25,
    });
  });

  it("shows onboarding when no key is stored", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-onboard-"));
    try {
      const keyStore = new KeyStore(dir, {});
      const { stdout } = mountApp({ keyStore });

      await waitForFrame(stdout, "Paste your key");
      const frame = lastFrame(stdout);
      expect(frame).toContain("artificialanalysis.ai/data-api");
      expect(frame).toContain("q or ctrl+c quit");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stores a pasted key and enters the main screen", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-onboard-"));
    try {
      const keyStore = new KeyStore(dir, {});
      const fakeService = {
        loadModels: vi.fn(async () => ({
          models: demoModels(),
          rateLimit: { limit: 100, remaining: 95, reset: Math.floor(Date.now() / 1000) + 86_400 },
          indexVersion: 4.1,
          storedAt: Date.now(),
          fromCache: false,
          stale: false,
        })),
      };
      const { stdout, stdin } = mountApp({
        keyStore,
        widthOverride: 140,
        serviceFactory: () => fakeService as unknown as DataService,
      });

      await waitForFrame(stdout, "Paste your key");
      stdin.write("test-key-1234567890");
      stdin.write("\n");
      await waitForFrame(stdout, "34/34");

      expect(await keyStore.read()).toBe("test-key-1234567890");
      expect(fakeService.loadModels).toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses a stored key to load data directly", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-key-"));
    try {
      const keyStore = new KeyStore(dir, {});
      await keyStore.write("stored-key");
      const fakeService = {
        loadModels: vi.fn(async () => ({
          models: demoModels(),
          rateLimit: { limit: 100, remaining: 95, reset: Math.floor(Date.now() / 1000) + 86_400 },
          indexVersion: 4.1,
          storedAt: Date.now(),
          fromCache: false,
          stale: false,
        })),
      };
      const { stdout } = mountApp({
        keyStore,
        widthOverride: 140,
        serviceFactory: () => fakeService as unknown as DataService,
      });

      await waitForFrame(stdout, "34/34");
      expect(fakeService.loadModels).toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("renders a compact tab bar in narrow terminals", async () => {
    const { stdout } = mountApp({ demo: true, widthOverride: 80 });

    await waitForFrame(stdout, "Models");
    const frame = lastFrame(stdout);
    expect(frame).not.toContain("1 Models");
  });

  it("shows an empty Compare hint until models are pinned", async () => {
    const { stdout } = mountApp({ demo: true, widthOverride: 140 });

    await waitForFrame(stdout, "Models");
    await vi.waitFor(() => {
      setState({ plotPins: [], tab: "compare" });
      expect(lastFrame(stdout)).toContain("pin models on the Models tab");
    });
  });

  it("compares pinned models side by side with metric winners", async () => {
    const { stdout } = mountApp({ demo: true, widthOverride: 140 });

    await waitForFrame(stdout, "Models");
    await vi.waitFor(() => {
      setState({ plotPins: ["kestrel-1", "lumen-forge-x2"], tab: "compare" });
      expect(lastFrame(stdout)).toContain("kestrel-1");
    });
    const frame = lastFrame(stdout);
    expect(frame).toContain("lumen-forge-x2");
    expect(frame).toContain("Intel");
    expect(frame).toContain("★");
    expect(frame).toContain("2 pinned");
  });

  it("keeps loaded arenas when models refresh", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-refresh-"));
    try {
      const keyStore = new KeyStore(dir, {});
      await keyStore.write("stored-key");
      const fakeService = {
        loadModels: vi.fn(async () => ({
          models: demoModels(),
          rateLimit: { limit: 100, remaining: 95, reset: Math.floor(Date.now() / 1000) + 86_400 },
          indexVersion: 4.1,
          storedAt: Date.now(),
          fromCache: false,
          stale: false,
          arenas: {},
        })),
        loadArena: vi.fn(async () => ({ entries: [], rateLimit: null, fromCache: true })),
      };
      const { stdout, stdin } = mountApp({
        keyStore,
        widthOverride: 140,
        serviceFactory: () => fakeService as unknown as DataService,
      });

      await waitForFrame(stdout, "34/34");
      const tts = demoArenas().tts;
      setState({ data: { ...getState().data, arenas: { tts } } });
      stdin.write("r");

      await vi.waitFor(() => {
        expect(fakeService.loadModels.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(getState().data.arenas.tts).toEqual(tts);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("shows arena fetch errors on the main screen", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aaplot-arena-err-"));
    try {
      const keyStore = new KeyStore(dir, {});
      await keyStore.write("stored-key");
      const fakeService = {
        loadModels: vi.fn(async () => ({
          models: demoModels(),
          rateLimit: { limit: 100, remaining: 95, reset: Math.floor(Date.now() / 1000) + 86_400 },
          indexVersion: 4.1,
          storedAt: Date.now(),
          fromCache: false,
          stale: false,
          arenas: {},
        })),
        loadArena: vi.fn(async () => {
          throw new ApiError("quota exhausted", "http", 429, null, 3600);
        }),
      };
      const { stdout } = mountApp({
        keyStore,
        widthOverride: 140,
        serviceFactory: () => fakeService as unknown as DataService,
      });

      await waitForFrame(stdout, "34/34");
      setState({ tab: "media" });
      await waitForFrame(stdout, "resets in 1h");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
