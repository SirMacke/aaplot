import { ApiClient, ApiError, type FreeModelsResult } from "../api/client.js";
import { FREE_MODELS_PATH, type RateLimit } from "../api/schemas.js";
import { FileCache } from "./cache.js";

export interface ModelsSnapshot {
  models: FreeModelsResult["models"];
  rateLimit: RateLimit | null;
  indexVersion: number;
  storedAt: number;
  fromCache: boolean;
  stale: boolean;
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

  async loadModels(): Promise<ModelsSnapshot> {
    const cached = await this.cache.get<FreeModelsResult>(FREE_MODELS_PATH);
    if (cached !== null && cached.fresh) {
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
  };
}
