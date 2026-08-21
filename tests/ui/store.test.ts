import { afterEach, describe, expect, it, vi } from "vitest";
import { getState, resetState, setState, subscribe } from "../../src/ui/store.js";

afterEach(() => {
  resetState();
});

describe("store", () => {
  it("merges partial updates", () => {
    setState({ tab: "plot" });
    expect(getState().tab).toBe("plot");
    expect(getState().screen).toBe("loading");
    setState({ screen: "main", helpOpen: true });
    expect(getState()).toMatchObject({ tab: "plot", screen: "main", helpOpen: true });
  });

  it("notifies subscribers on updates", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setState({ tab: "media" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setState({ tab: "models" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("resets to the initial state", () => {
    setState({ tab: "media", screen: "main", apiKey: "k", helpOpen: true });
    resetState();
    expect(getState()).toMatchObject({
      tab: "models",
      screen: "loading",
      apiKey: null,
      helpOpen: false,
    });
    expect(getState().data.models).toEqual([]);
  });
});
