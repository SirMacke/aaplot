import { Box, Text, useInput } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import { renderModelsQuadrant, type YField } from "../../render/plot.js";
import { isNarrow } from "../logic.js";
import {
  loadPlotPresets,
  persistPlotPins,
  savePlotPreset,
} from "../pin-persistence.js";
import { setState, useAppState } from "../store.js";

export interface PlotTabProps {
  models: FreeModel[];
  ascii: boolean;
  width: number;
  yField: YField;
}

const Y_LABELS: Record<YField, string> = {
  intelligence: "intelligence",
  coding: "coding",
  agentic: "agentic",
  speed: "speed",
};

export function PlotTab(props: PlotTabProps) {
  const { plotPins, plotPinFill, presetInputOpen, presetInput, presetListOpen } = useAppState();
  const [presets, setPresets] = React.useState<Record<string, { slugs: string[]; y?: YField }>>({});
  const narrow = isNarrow(props.width);
  const plotWidth = Math.max(40, Math.min(narrow ? props.width - 4 : 60, props.width - 4));
  const plotHeight = narrow ? 16 : 22;

  React.useEffect(() => {
    if (!presetListOpen) return;
    void loadPlotPresets().then(setPresets);
  }, [presetListOpen]);

  useInput((input, key) => {
    if (presetInputOpen) {
      if (key.escape) {
        setState({ presetInputOpen: false, presetInput: "" });
        return;
      }
      if (key.backspace || key.delete) {
        setState({ presetInput: presetInput.slice(0, -1) });
        return;
      }
      if (key.return) {
        void savePlotPreset(presetInput).then(() => {
          setState({ presetInputOpen: false, presetInput: "" });
        });
        return;
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        setState({ presetInput: presetInput + input });
      }
      return;
    }
    if (presetListOpen) {
      if (key.escape) {
        setState({ presetListOpen: false });
        return;
      }
      const names = Object.keys(presets);
      const index = Number.parseInt(input, 10);
      if (Number.isFinite(index) && index >= 1 && index <= names.length) {
        const name = names[index - 1];
        if (name !== undefined) {
          const preset = presets[name];
          setState({
            plotPins: preset.slugs,
            ...(preset.y !== undefined ? { plotY: preset.y } : {}),
            presetListOpen: false,
          });
          void persistPlotPins();
        }
      }
      return;
    }
    if (input === "f") {
      setState({ plotPinFill: !plotPinFill });
      return;
    }
    if (input === "s") {
      setState({ presetInputOpen: true, presetInput: "" });
      return;
    }
    if (input === "l") {
      setState({ presetListOpen: true });
      return;
    }
    const nextY: Record<string, YField> = {
      i: "intelligence",
      c: "coding",
      a: "agentic",
      t: "speed",
    };
    const field = nextY[input];
    if (field !== undefined) {
      setState({ plotY: field });
      void persistPlotPins();
    }
  });

  const usingPins = plotPins.length > 0;
  const plot = renderModelsQuadrant(props.models, {
    ascii: props.ascii,
    width: plotWidth,
    height: plotHeight,
    top: 25,
    sortBy: "intelligence",
    y: props.yField,
    colorize: !props.ascii,
    pinSlugs: usingPins ? plotPins : undefined,
    pinFill: plotPinFill,
  });

  const presetNames = Object.keys(presets);

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Y: {Y_LABELS[props.yField]} · i/c/a/t switch axis ·{" "}
        {usingPins
          ? `${plotPins.length} pinned${plotPinFill ? " + fill" : " only"} · f toggle fill`
          : "top 25"}{" "}
        · ★ band leaders · colors by lab · s save · l load · ? keys
      </Text>
      {presetInputOpen ? (
        <Text>
          preset name: <Text color="cyan">{presetInput}</Text>
          <Text dimColor> esc cancel · enter save</Text>
        </Text>
      ) : null}
      {presetListOpen ? (
        <Box flexDirection="column">
          <Text bold>plot presets</Text>
          {presetNames.length === 0 ? (
            <Text dimColor>no presets saved yet — press s to save the current pins</Text>
          ) : (
            presetNames.map((name, index) => (
              <Text key={name}>
                {index + 1}. {name} ({presets[name]?.slugs.length ?? 0} models)
              </Text>
            ))
          )}
          <Text dimColor>type 1-{presetNames.length || 0} to load · esc close</Text>
        </Box>
      ) : null}
      <Text>{plot}</Text>
    </Box>
  );
}
