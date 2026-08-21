import { z } from "zod";
import {
  FREE_MODELS_PATH,
  apiErrorSchema,
  arenaResponseSchema,
  freeModelsResponseSchema,
  listPageSchema,
  mediaArenaPaths,
  rateLimitSchema,
  type ArenaEntry,
  formatSchemaIssues,
  type FreeModel,
  type MediaArenaKind,
  type Pagination,
  type RateLimit,
  type Tier,
} from "./schemas.js";

const DEFAULT_BASE_URL = "https://artificialanalysis.ai/api/v2";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_PAGES = 50;

export type ApiErrorKind = "http" | "network" | "schema";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly details: unknown;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null = null,
    details: unknown = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface FreeModelsResult {
  tier: Tier;
  intelligenceIndexVersion: number;
  models: FreeModel[];
  pagination: Pagination;
  rateLimit: RateLimit | null;
}

export interface ArenaResult {
  tier: Tier;
  entries: ArenaEntry[];
  rateLimit: RateLimit | null;
}

export interface ApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
  sleepFn?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
}

interface JsonResponse {
  body: unknown;
  rateLimit: RateLimit | null;
}

interface PagedResult {
  items: unknown[];
  tier: Tier;
  intelligenceIndexVersion: number | undefined;
  lastPagination: Pagination;
  rateLimit: RateLimit | null;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseRetryAfterSeconds(headers: Headers): number | null {
  const raw = headers.get("Retry-After");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function parseRateLimit(headers: Headers): RateLimit | null {
  const candidate = {
    limit: Number(headers.get("X-RateLimit-Limit")),
    remaining: Number(headers.get("X-RateLimit-Remaining")),
    reset: Number(headers.get("X-RateLimit-Reset")),
  };
  const parsed = rateLimitSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function parseErrorBody(text: string): { error: string; details: unknown } | null {
  try {
    const parsed = apiErrorSchema.safeParse(JSON.parse(text));
    return parsed.success ? { error: parsed.data.error, details: parsed.data.details ?? null } : null;
  } catch {
    return null;
  }
}

export class ApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;
  private readonly sleepFn: (milliseconds: number) => Promise<void>;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getFreeModels(): Promise<FreeModelsResult> {
    const pages = await this.requestAllPages(FREE_MODELS_PATH);
    const body = {
      tier: pages.tier,
      intelligence_index_version: pages.intelligenceIndexVersion ?? 0,
      pagination: pages.lastPagination,
      data: pages.items,
    };
    const parsed = this.parseOrThrow(freeModelsResponseSchema, body, "language models");
    return {
      tier: parsed.tier,
      intelligenceIndexVersion: parsed.intelligence_index_version,
      models: parsed.data,
      pagination: parsed.pagination,
      rateLimit: pages.rateLimit,
    };
  }

  async getArena(kind: MediaArenaKind): Promise<ArenaResult> {
    const path = mediaArenaPaths[kind];
    const { body, rateLimit } = await this.requestJson(path, {});
    const parsed = this.parseOrThrow(arenaResponseSchema, body, path);
    return { tier: parsed.tier, entries: parsed.data, rateLimit };
  }

  private async requestAllPages(path: string): Promise<PagedResult> {
    let items: unknown[] = [];
    let tier: Tier | null = null;
    let intelligenceIndexVersion: number | undefined;
    let lastPagination: Pagination | null = null;
    let rateLimit: RateLimit | null = null;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { body, rateLimit: pageRateLimit } = await this.requestJson(path, { page: String(page) });
      rateLimit = pageRateLimit;
      const parsed = this.parseOrThrow(listPageSchema, body, path);
      tier = parsed.tier;
      if (parsed.intelligence_index_version !== undefined) {
        intelligenceIndexVersion = parsed.intelligence_index_version;
      }
      items = items.concat(parsed.data);
      lastPagination = parsed.pagination;
      if (!parsed.pagination.has_more) break;
    }
    if (tier === null || lastPagination === null) {
      throw new ApiError("invalid paged response", "schema");
    }
    return { items, tier, intelligenceIndexVersion, lastPagination, rateLimit };
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const query = new URLSearchParams(params).toString();
    return query.length > 0 ? `${this.baseUrl}${path}?${query}` : `${this.baseUrl}${path}`;
  }

  private backoffMs(attempt: number): number {
    return 500 * 2 ** attempt;
  }

  private async requestJson(path: string, params: Record<string, string>): Promise<JsonResponse> {
    const url = this.buildUrl(path, params);
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.fetchFn(url, {
          headers: { "x-api-key": this.apiKey, accept: "application/json" },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        if (attempt < this.maxRetries) {
          await this.sleepFn(this.backoffMs(attempt));
          continue;
        }
        throw new ApiError(`network error: ${errorMessage(error)}`, "network");
      }
      if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
        const retryAfter = parseRetryAfterSeconds(response.headers);
        const delay =
          response.status === 429 && retryAfter !== null
            ? retryAfter * 1000
            : this.backoffMs(attempt);
        await this.sleepFn(delay);
        continue;
      }
      const text = await response.text();
      const rateLimit = parseRateLimit(response.headers);
      if (!response.ok) {
        const errorBody = parseErrorBody(text);
        const retryAfter = parseRetryAfterSeconds(response.headers);
        throw new ApiError(
          errorBody?.error ?? `HTTP ${response.status}`,
          "http",
          response.status,
          errorBody?.details ?? null,
          response.status === 429 ? retryAfter : null,
        );
      }
      let body: unknown = null;
      try {
        body = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        throw new ApiError("invalid JSON response body", "schema");
      }
      return { body, rateLimit };
    }
  }

  private parseOrThrow<S extends z.ZodTypeAny>(schema: S, body: unknown, what: string): z.infer<S> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        `unexpected ${what} response shape — aaplot may need an update (${formatSchemaIssues(parsed.error)})`,
        "schema",
        null,
        parsed.error.flatten(),
      );
    }
    return parsed.data;
  }
}
