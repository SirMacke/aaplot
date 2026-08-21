import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RateLimit } from "../api/schemas.js";

export const DAY_MS = 86_400_000;

interface CacheRecord<T> {
  version: 1;
  storedAt: number;
  expiresAt: number;
  rateLimit: RateLimit | null;
  data: T;
}

export interface CachedValue<T> {
  data: T;
  rateLimit: RateLimit | null;
  storedAt: number;
  expiresAt: number;
  fresh: boolean;
}

export interface FileCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

export class FileCache {
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly dir: string,
    options: FileCacheOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? DAY_MS;
    this.now = options.now ?? Date.now;
  }

  private fileFor(key: string): string {
    const hash = createHash("sha1").update(key).digest("hex");
    return path.join(this.dir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    let record: CacheRecord<T>;
    try {
      record = JSON.parse(await readFile(this.fileFor(key), "utf8")) as CacheRecord<T>;
    } catch {
      return null;
    }
    if (
      record === null ||
      typeof record !== "object" ||
      !("data" in record) ||
      typeof record.storedAt !== "number" ||
      typeof record.expiresAt !== "number"
    ) {
      return null;
    }
    const timestamp = this.now();
    return {
      data: record.data,
      rateLimit: record.rateLimit ?? null,
      storedAt: record.storedAt,
      expiresAt: record.expiresAt,
      fresh: timestamp < record.expiresAt,
    };
  }

  async set<T>(key: string, data: T, rateLimit: RateLimit | null = null): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const timestamp = this.now();
    const record: CacheRecord<T> = {
      version: 1,
      storedAt: timestamp,
      expiresAt: timestamp + this.ttlMs,
      rateLimit,
      data,
    };
    const file = this.fileFor(key);
    const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(temp, JSON.stringify(record));
    await rename(temp, file);
  }

  async delete(key: string): Promise<void> {
    await rm(this.fileFor(key), { force: true });
  }

  async clear(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}
