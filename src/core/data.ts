import { ApiClient, ApiError, type ArenaResult, type FreeModelsResult } from "../api/client.js";
import { FREE_MODELS_PATH, mediaArenaPaths, type MediaArenaKind, type RateLimit } from "../api/schemas.js";
import { FileCache } from "./cache.js";

export interface ModelsSnapshot {
  models: FreeModelsResult["models"];
  rateLimit: RateLimit | null;
  indexVersion: number;
  storedAt: number;
  fromCache: boolean;
  stale: boolean;
  arenas: Partial<Record<MediaArenaKind, ArenaResult["entries"]>>;
}

export interface DataServiceOptions {
  apiKey: string;
  cache: FileCache;
  client?: ApiClient;
  fetchFn?: typeof fetch;
  sleepFn?: (milliseconds: number) => Promise<void>;
  baseUrl?: string;
  offline?: boolean;
  now?: () => number;
}

export class DataService {
  private readonly cache: FileCache;
  private readonly client: ApiClient;
  private readonly offline: boolean;
  private readonly now: () => number;

  constructor(options: DataServiceOptions) {
    this.cache = options.cache;
    this.offline = options.offline ?? false;
    this.now = options.now ?? Date.now;
    this.client =
      options.client ??
      new ApiClient({
        apiKey: options.apiKey,
        ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
        ...(options.sleepFn !== undefined ? { sleepFn: options.sleepFn } : {}),
        ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
      });
  }

  async loadArena(
    kind: MediaArenaKind,
    options: { force?: boolean } = {},
  ): Promise<{ entries: ArenaResult["entries"]; rateLimit: RateLimit | null; fromCache: boolean }> {
    const force = options.force ?? false;
    const path = mediaArenaPaths[kind];
    const cached = await this.cache.get<ArenaResult>(path);
    if (!force && cached !== null && cached.fresh) {
      return { entries: cached.data.entries, rateLimit: cached.rateLimit, fromCache: true };
    }
    if (this.offline) {
      if (cached !== null) return { entries: cached.data.entries, rateLimit: cached.rateLimit, fromCache: true };
      throw new ApiError("offline and no cached arena data", "network");
    }
    if (cached !== null && (cached.rateLimit?.remaining ?? Infinity) <= 0) {
      return { entries: cached.data.entries, rateLimit: cached.rateLimit, fromCache: true };
    }
    try {
      const result = await this.client.getArena(kind);
      await this.cache.set(path, result, result.rateLimit);
      return { entries: result.entries, rateLimit: result.rateLimit, fromCache: false };
    } catch (error) {
      if (cached !== null) return { entries: cached.data.entries, rateLimit: cached.rateLimit, fromCache: true };
      throw error;
    }
  }

  async loadModels(options: { force?: boolean } = {}): Promise<ModelsSnapshot> {
    const force = options.force ?? false;
    const cached = await this.cache.get<FreeModelsResult>(FREE_MODELS_PATH);
    if (!force && cached !== null && cached.fresh) {
      return snapshotFrom(cached.data, cached.storedAt, true, false);
    }
    if (this.offline) {
      if (cached !== null) return snapshotFrom(cached.data, cached.storedAt, true, true);
      throw new ApiError("offline and no cached data", "network");
    }
    if (cached !== null && (cached.rateLimit?.remaining ?? Infinity) <= 0) {
      return snapshotFrom(cached.data, cached.storedAt, true, true);
    }
    try {
      const result = await this.client.getFreeModels();
      await this.cache.set(FREE_MODELS_PATH, result, result.rateLimit);
      return snapshotFrom(result, this.now(), false, false);
    } catch (error) {
      if (cached !== null) return snapshotFrom(cached.data, cached.storedAt, true, true);
      throw error;
    }
  }
}

function snapshotFrom(
  result: FreeModelsResult,
  storedAt: number,
  fromCache: boolean,
  stale: boolean,
): ModelsSnapshot {
  return {
    models: result.models,
    rateLimit: result.rateLimit,
    indexVersion: result.intelligenceIndexVersion,
    storedAt,
    fromCache,
    stale,
    arenas: {},
  };
}
