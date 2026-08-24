import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/api/client.js";
import {
  cycleTab,
  errorMessage,
  formatDuration,
  formatFreshness,
  formatIndexVersion,
  formatQuota,
  isNarrow,
  keyToAction,
  listViewport,
} from "../../src/ui/logic.js";

describe("keyToAction", () => {
  it("quits from onboarding with q and ignores other keys", () => {
    expect(keyToAction("q", {}, "onboarding", false)).toEqual({ type: "quit" });
    expect(keyToAction("?", {}, "onboarding", false)).toBeNull();
  });

  it("closes help with escape or ? and quits with q", () => {
    expect(keyToAction("?", {}, "main", true)).toEqual({ type: "close-overlay" });
    expect(keyToAction("", { escape: true }, "main", true)).toEqual({ type: "close-overlay" });
    expect(keyToAction("q", {}, "main", true)).toEqual({ type: "quit" });
    expect(keyToAction("r", {}, "main", true)).toBeNull();
  });

  it("maps tab switching keys", () => {
    expect(keyToAction("", { rightArrow: true }, "main", false)).toEqual({ type: "next-tab" });
    expect(keyToAction("", { tab: true }, "main", false)).toEqual({ type: "next-tab" });
    expect(keyToAction("", { leftArrow: true }, "main", false)).toEqual({ type: "prev-tab" });
    expect(keyToAction("", { tab: true, shift: true }, "main", false)).toEqual({ type: "prev-tab" });
    expect(keyToAction("3", {}, "main", false)).toEqual({ type: "goto-tab", tab: "compare" });
  });

  it("maps help, refresh, and quit", () => {
    expect(keyToAction("?", {}, "main", false)).toEqual({ type: "toggle-help" });
    expect(keyToAction("r", {}, "main", false)).toEqual({ type: "refresh" });
    expect(keyToAction("q", {}, "main", false)).toEqual({ type: "quit" });
  });

  it("only allows refresh and quit on the error screen", () => {
    expect(keyToAction("r", {}, "error", false)).toEqual({ type: "refresh" });
    expect(keyToAction("q", {}, "error", false)).toEqual({ type: "quit" });
    expect(keyToAction("", { rightArrow: true }, "error", false)).toBeNull();
  });
});

describe("cycleTab", () => {
  it("wraps forward and backward", () => {
    expect(cycleTab("media", 1)).toBe("models");
    expect(cycleTab("models", -1)).toBe("media");
    expect(cycleTab("models", 1)).toBe("plot");
    expect(cycleTab("compare", -1)).toBe("plot");
  });
});

describe("formatDuration", () => {
  it("formats hours, minutes, and under a minute", () => {
    expect(formatDuration(0)).toBe("<1m");
    expect(formatDuration(30_000)).toBe("<1m");
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
    expect(formatDuration(60 * 60_000)).toBe("1h");
    expect(formatDuration(18.5 * 3_600_000)).toBe("18h 30m");
  });

  it("clamps negative durations", () => {
    expect(formatDuration(-5000)).toBe("<1m");
  });
});

describe("formatQuota", () => {
  it("shows remaining and reset countdown", () => {
    const now = 1_753_000_000_000;
    const rateLimit = { limit: 100, remaining: 97, reset: 1_753_000_000 + 3_600 * 2 };
    expect(formatQuota(rateLimit, now)).toBe("quota 97/100 · resets in 2h");
  });

  it("marks exhausted quotas", () => {
    const now = 1_753_000_000_000;
    const rateLimit = { limit: 100, remaining: 0, reset: 1_753_000_000 + 60 };
    expect(formatQuota(rateLimit, now)).toBe("quota 0/100 exhausted · resets in 1m");
  });

  it("handles missing rate limit info", () => {
    expect(formatQuota(null, 0)).toBe("quota —");
  });
});

describe("formatFreshness", () => {
  it("describes data age", () => {
    const now = 10_000_000;
    expect(formatFreshness(null, now)).toBe("no data");
    expect(formatFreshness(now - 10_000, now)).toBe("updated just now");
    expect(formatFreshness(now - 2 * 3_600_000, now)).toBe("updated 2h ago");
    expect(formatFreshness(now - 45 * 60_000, now)).toBe("updated 45m ago");
  });
});

describe("formatIndexVersion", () => {
  it("prefixes the index version", () => {
    expect(formatIndexVersion(4.1)).toBe("Index v4.1");
    expect(formatIndexVersion(null)).toBe("");
  });
});

describe("isNarrow", () => {
  it("treats terminals below 120 columns as narrow", () => {
    expect(isNarrow(119)).toBe(true);
    expect(isNarrow(120)).toBe(false);
    expect(isNarrow(200)).toBe(false);
  });
});

describe("errorMessage", () => {
  it("explains tier and quota errors", () => {
    expect(errorMessage(new ApiError("nope", "http", 403))).toContain("Compare");
    expect(errorMessage(new ApiError("nope", "http", 429, null, 3600))).toContain("resets in 1h");
    expect(errorMessage(new ApiError("nope", "network"))).toContain("offline");
  });

  it("passes through other errors", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });
});

describe("listViewport", () => {
  it("keeps the selection centered in a scrolling window", () => {
    expect(listViewport(0, 100, 18)).toEqual({ start: 0, end: 18 });
    expect(listViewport(17, 100, 18)).toEqual({ start: 8, end: 26 });
    expect(listViewport(99, 100, 18)).toEqual({ start: 82, end: 100 });
    expect(listViewport(5, 10, 18)).toEqual({ start: 0, end: 10 });
  });
});

describe("overlay key routing", () => {
  it("ignores tab navigation while a models overlay is open", () => {
    expect(
      keyToAction("", { rightArrow: true }, "main", false, { tab: "models", detailOpen: true }),
    ).toBeNull();
    expect(
      keyToAction("", { tab: true }, "main", false, { tab: "models", searchOpen: true }),
    ).toBeNull();
  });
});
