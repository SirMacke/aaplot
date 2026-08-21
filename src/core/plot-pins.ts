import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { YField } from "../render/plot.js";

export const PLOT_PINS_FILE = "plot-pins.json";
export const PLOT_PRESETS_FILE = "plot-presets.json";
export const MAX_PLOT_PINS = 25;

export interface PlotPinsData {
  slugs: string[];
  yField?: YField;
  savedAt: string;
}

export interface PlotPreset {
  slugs: string[];
  y?: YField;
}

export type PlotPresetsData = Record<string, PlotPreset>;

export function normalizePlotPins(slugs: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const slug of slugs) {
    if (slug === "" || seen.has(slug)) continue;
    seen.add(slug);
    normalized.push(slug);
    if (normalized.length >= MAX_PLOT_PINS) break;
  }
  return normalized;
}

export function togglePlotPin(pins: string[], slug: string): string[] {
  if (pins.includes(slug)) return pins.filter((entry) => entry !== slug);
  return normalizePlotPins([...pins, slug]);
}

export class PlotPinStore {
  constructor(private readonly configDir: string) {}

  private pinsPath(): string {
    return path.join(this.configDir, PLOT_PINS_FILE);
  }

  private presetsPath(): string {
    return path.join(this.configDir, PLOT_PRESETS_FILE);
  }

  async readPins(): Promise<PlotPinsData | null> {
    try {
      const raw = JSON.parse(await readFile(this.pinsPath(), "utf8")) as PlotPinsData;
      if (!Array.isArray(raw.slugs)) return null;
      return {
        slugs: normalizePlotPins(raw.slugs.filter((slug) => typeof slug === "string")),
        yField: raw.yField,
        savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async writePins(data: PlotPinsData): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    const payload: PlotPinsData = {
      slugs: normalizePlotPins(data.slugs),
      yField: data.yField,
      savedAt: data.savedAt,
    };
    await writeFile(this.pinsPath(), `${JSON.stringify(payload, null, 2)}\n`);
    if (process.platform !== "win32") {
      await chmod(this.pinsPath(), 0o600);
    }
  }

  async readPresets(): Promise<PlotPresetsData> {
    try {
      const raw = JSON.parse(await readFile(this.presetsPath(), "utf8")) as PlotPresetsData;
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
      const presets: PlotPresetsData = {};
      for (const [name, preset] of Object.entries(raw)) {
        if (!Array.isArray(preset?.slugs)) continue;
        presets[name] = {
          slugs: normalizePlotPins(preset.slugs.filter((slug) => typeof slug === "string")),
          y: preset.y,
        };
      }
      return presets;
    } catch {
      return {};
    }
  }

  async writePresets(data: PlotPresetsData): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    await writeFile(this.presetsPath(), `${JSON.stringify(data, null, 2)}\n`);
    if (process.platform !== "win32") {
      await chmod(this.presetsPath(), 0o600);
    }
  }
}
