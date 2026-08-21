import { ApiError } from "../api/client.js";
import type { RateLimit } from "../api/schemas.js";
import type { Screen, TabId } from "./store.js";

export const TABS: readonly TabId[] = ["models", "plot", "compare", "media"];

export interface KeyFlags {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  escape?: boolean;
  return?: boolean;
  tab?: boolean;
  shift?: boolean;
}

export type InputAction =
  | { type: "next-tab" }
  | { type: "prev-tab" }
  | { type: "goto-tab"; tab: TabId }
  | { type: "toggle-help" }
  | { type: "close-overlay" }
  | { type: "quit" }
  | { type: "refresh" };

export function keyToAction(
  input: string,
  key: KeyFlags,
  screen: Screen,
  helpOpen: boolean,
  context: { tab?: TabId; detailOpen?: boolean; searchOpen?: boolean } = {},
): InputAction | null {
  if (screen === "onboarding") return null;
  if (context.searchOpen || context.detailOpen) {
    if (helpOpen) {
      if (key.escape || input === "?") return { type: "close-overlay" };
      if (input === "q") return { type: "quit" };
      return null;
    }
    if (input === "q") return { type: "quit" };
    if (input === "?") return { type: "toggle-help" };
    return null;
  }
  if (helpOpen) {
    if (key.escape || input === "?") return { type: "close-overlay" };
    if (input === "q") return { type: "quit" };
    return null;
  }
  if (input === "q") return { type: "quit" };
  if (input === "?") return { type: "toggle-help" };
  if (screen !== "main") {
    if (input === "r" && screen === "error") return { type: "refresh" };
    return null;
  }
  if (key.leftArrow || (key.tab && key.shift)) return { type: "prev-tab" };
  if (key.rightArrow || key.tab) return { type: "next-tab" };
  if (key.escape) return { type: "close-overlay" };
  if (input === "r") return { type: "refresh" };
  const index = ["1", "2", "3", "4"].indexOf(input);
  if (index >= 0) return { type: "goto-tab", tab: TABS[index] ?? "models" };
  return null;
}

export function cycleTab(current: TabId, direction: 1 | -1): TabId {
  const index = TABS.indexOf(current);
  const next = (index + direction + TABS.length) % TABS.length;
  return TABS[next] ?? "models";
}

export function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

export function formatQuota(rateLimit: RateLimit | null, now: number): string {
  if (rateLimit === null) return "quota —";
  const resetMs = rateLimit.reset * 1000 - now;
  const label = `quota ${rateLimit.remaining}/${rateLimit.limit}`;
  if (rateLimit.remaining <= 0) return `${label} exhausted · resets in ${formatDuration(resetMs)}`;
  return `${label} · resets in ${formatDuration(resetMs)}`;
}

export function formatFreshness(storedAt: number | null, now: number): string {
  if (storedAt === null) return "no data";
  const age = now - storedAt;
  if (age < 60_000) return "updated just now";
  return `updated ${formatDuration(age)} ago`;
}

export function formatIndexVersion(version: number | null): string {
  return version === null ? "" : `Index v${version}`;
}

export function isNarrow(width: number): boolean {
  return width < 120;
}

export function listViewport(
  selectedIndex: number,
  total: number,
  visible: number,
): { start: number; end: number } {
  if (total <= visible) return { start: 0, end: total };
  let start = selectedIndex - Math.floor(visible / 2);
  start = Math.max(0, Math.min(start, total - visible));
  return { start, end: start + visible };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "your key's tier cannot access this data — the free tier covers Models, Plot, and Media";
    }
    if (error.status === 429) {
      const seconds = error.retryAfterSeconds ?? 0;
      return `daily quota exhausted — resets in ${formatDuration(seconds * 1000)}`;
    }
    if (error.kind === "schema") return error.message;
    if (error.kind === "network") return "offline — no cached data yet. Press r to retry";
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
