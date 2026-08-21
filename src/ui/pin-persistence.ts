import { PlotPinStore, type PlotPresetsData } from "../core/plot-pins.js";
import { getConfigPaths } from "../core/config.js";
import { getState, setState } from "./store.js";

let pinStore: PlotPinStore | null = null;

export function getPlotPinStore(): PlotPinStore {
  if (pinStore === null) pinStore = new PlotPinStore(getConfigPaths().config);
  return pinStore;
}

export async function loadSavedPlotPins(): Promise<void> {
  const saved = await getPlotPinStore().readPins();
  if (saved === null) return;
  setState({
    plotPins: saved.slugs,
    ...(saved.yField !== undefined ? { plotY: saved.yField } : {}),
    ...(saved.xField !== undefined ? { plotX: saved.xField } : {}),
  });
}

export async function persistPlotPins(): Promise<void> {
  const state = getState();
  await getPlotPinStore().writePins({
    slugs: state.plotPins,
    yField: state.plotY,
    xField: state.plotX,
    savedAt: new Date().toISOString(),
  });
}

export async function loadPlotPresets(): Promise<PlotPresetsData> {
  return getPlotPinStore().readPresets();
}

export async function savePlotPreset(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === "") return;
  const state = getState();
  const presets = await loadPlotPresets();
  presets[trimmed] = { slugs: state.plotPins, y: state.plotY, x: state.plotX };
  await getPlotPinStore().writePresets(presets);
  await persistPlotPins();
}

export async function applyPlotPreset(name: string, presets: PlotPresetsData): Promise<void> {
  const preset = presets[name];
  if (preset === undefined) return;
  setState({
    plotPins: preset.slugs,
    ...(preset.y !== undefined ? { plotY: preset.y } : {}),
    ...(preset.x !== undefined ? { plotX: preset.x } : {}),
    presetListOpen: false,
  });
  await persistPlotPins();
}
