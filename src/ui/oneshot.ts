import { ApiError } from "../api/client.js";
import { demoModels } from "../api/demo.js";
import type { FreeModel } from "../api/schemas.js";
import { FileCache } from "../core/cache.js";
import { API_KEY_ENV_VAR, KeyStore, getConfigPaths } from "../core/config.js";
import { DataService } from "../core/data.js";
import {
  formatCompareJson,
  formatCompareText,
  formatModelsJson,
  formatModelsText,
  formatPlotJson,
  formatPlotText,
  missingCompareSlugs,
  type DatasetMeta,
} from "../core/oneshot.js";
import type { ModelTableFilters } from "../core/models-table.js";
import { shouldUseAscii, type CliArgs } from "./args.js";
import { errorMessage } from "./logic.js";

export interface OneShotIo {
  stdout: { write: (text: string) => unknown; isTTY?: boolean };
  stderr: { write: (text: string) => unknown };
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  keyStore?: KeyStore;
  serviceFactory?: (apiKey: string, offline: boolean) => DataService;
}

export const DEMO_META: DatasetMeta = {
  source: "demo",
  indexVersion: 4.1,
  updatedAt: null,
  stale: false,
};

function cliErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return `the API rejected your key (401) — check ${API_KEY_ENV_VAR} or run aaplot to paste a new one`;
    }
    if (error.kind === "network") {
      return "no network and no cached data — retry online, or use --demo";
    }
  }
  return errorMessage(error);
}

async function loadDataset(
  args: CliArgs,
  io: OneShotIo,
): Promise<{ models: FreeModel[]; meta: DatasetMeta } | { error: string }> {
  if (args.demo) return { models: demoModels(), meta: DEMO_META };
  const env = io.env ?? process.env;
  const keyStore = io.keyStore ?? new KeyStore(getConfigPaths().config, env);
  const apiKey = await keyStore.read();
  if (apiKey === null) {
    return {
      error: `no API key — set ${API_KEY_ENV_VAR}, run aaplot once to paste one, or use --demo`,
    };
  }
  const service =
    io.serviceFactory?.(apiKey, args.offline) ??
    new DataService({
      apiKey,
      cache: new FileCache(getConfigPaths().cache),
      offline: args.offline,
    });
  try {
    const snapshot = await service.loadModels();
    return {
      models: snapshot.models,
      meta: {
        source: snapshot.fromCache ? "cache" : "live",
        indexVersion: snapshot.indexVersion,
        updatedAt: new Date(snapshot.storedAt).toISOString(),
        stale: snapshot.stale,
      },
    };
  } catch (error) {
    return { error: cliErrorMessage(error) };
  }
}

function filtersFrom(args: CliArgs): ModelTableFilters {
  return {
    query: "",
    creator: args.creator,
    minQuality: args.minQuality,
    maxCost: args.maxCost,
    cheap: args.cheap,
  };
}

/** Runs `aaplot models|plot|compare`. Returns the process exit code. */
export async function runOneShot(args: CliArgs, io: OneShotIo): Promise<number> {
  const env = io.env ?? process.env;
  const dataset = await loadDataset(args, io);
  if ("error" in dataset) {
    io.stderr.write(`aaplot: ${dataset.error}\n`);
    return 1;
  }
  const { models, meta } = dataset;
  const filters = filtersFrom(args);

  switch (args.command) {
    case "models": {
      const options = { filters, sort: args.sort ?? "value", top: args.top } as const;
      io.stdout.write(
        args.json
          ? formatModelsJson(models, meta, options)
          : formatModelsText(models, meta, options),
      );
      return 0;
    }
    case "plot": {
      const ascii = shouldUseAscii(args.ascii, env, io.platform ?? process.platform);
      const noColor = env.NO_COLOR !== undefined && env.NO_COLOR !== "";
      const options = {
        filters,
        y: args.y ?? "intelligence",
        x: args.x ?? "index_run_cost",
        sortBy: args.plotSort ?? "intelligence",
        top: args.top ?? 25,
        ascii,
        color: Boolean(io.stdout.isTTY) && !noColor && !ascii,
        width: args.width ?? 60,
        height: args.height,
      } as const;
      io.stdout.write(
        args.json ? formatPlotJson(models, meta, options) : formatPlotText(models, meta, options),
      );
      return 0;
    }
    case "compare": {
      const missing = missingCompareSlugs(models, args.slugs);
      if (missing.length > 0) {
        io.stderr.write(
          `aaplot: unknown model slug${missing.length > 1 ? "s" : ""}: ${missing.join(", ")} — list slugs with \`aaplot models\`\n`,
        );
        return 1;
      }
      io.stdout.write(
        args.json
          ? formatCompareJson(models, meta, args.slugs)
          : formatCompareText(models, meta, args.slugs),
      );
      return 0;
    }
    case "tui":
      io.stderr.write("aaplot: no one-shot command given\n");
      return 2;
  }
}
