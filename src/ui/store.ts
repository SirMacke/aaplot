import { useSyncExternalStore } from "react";
import type { FreeModel, RateLimit } from "../api/schemas.js";
import type { ModelSortField } from "../core/models-table.js";

export type TabId = "models" | "plot" | "compare" | "media";
export type Screen = "loading" | "onboarding" | "main" | "error";

export interface ModelsData {
  models: FreeModel[];
  rateLimit: RateLimit | null;
  indexVersion: number | null;
  storedAt: number | null;
  fromCache: boolean;
  stale: boolean;
}

export interface ModelFilters {
  query: string;
  creator: string | null;
  minQuality: number | null;
  maxCost: number | null;
  cheap: boolean;
}

export interface AppState {
  screen: Screen;
  tab: TabId;
  helpOpen: boolean;
  demo: boolean;
  offline: boolean;
  ascii: boolean;
  apiKey: string | null;
  error: string | null;
  data: ModelsData;
  filters: ModelFilters;
  sort: ModelSortField;
  sortAsc: boolean;
  selectedIndex: number;
  detailOpen: boolean;
  searchOpen: boolean;
}

export const initialModelsData: ModelsData = {
  models: [],
  rateLimit: null,
  indexVersion: null,
  storedAt: null,
  fromCache: false,
  stale: false,
};

export const initialFilters: ModelFilters = {
  query: "",
  creator: null,
  minQuality: null,
  maxCost: null,
  cheap: false,
};

const initialState: AppState = {
  screen: "loading",
  tab: "models",
  helpOpen: false,
  demo: false,
  offline: false,
  ascii: false,
  apiKey: null,
  error: null,
  data: initialModelsData,
  filters: initialFilters,
  sort: "value",
  sortAsc: false,
  selectedIndex: 0,
  detailOpen: false,
  searchOpen: false,
};

let state: AppState = initialState;
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof AppState)[]) {
    if (!Object.is(state[key], partial[key])) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetState(): void {
  state = {
    ...initialState,
    data: { ...initialModelsData },
    filters: { ...initialFilters },
    sort: "value",
    sortAsc: false,
    selectedIndex: 0,
    detailOpen: false,
    searchOpen: false,
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}
