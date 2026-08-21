import { Box, Text, useInput } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import { renderModelsQuadrant, type XField, type YField } from "../../render/plot.js";
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
  xField: XField;
}

const Y_OPTIONS: readonly { key: string; field: YField; label: string }[] = [
  { key: "i", field: "intelligence", label: "intel" },
  { key: "c", field: "coding", label: "coding" },
  { key: "a", field: "agentic", label: "agentic" },
  { key: "t", field: "speed", label: "speed" },
];

const X_OPTIONS: readonly { key: string; field: XField; label: string }[] = [
  { key: "$", field: "index_run_cost", label: "index-run $" },
  { key: "o", field: "output_price", label: "output $" },
];

function AxisPicker(props: {
  label: string;
  options: readonly { key: string; field: string; label: string }[];
  active: string;
}) {
  return (
    <Text>
      {props.label}:{" "}
      {props.options.map((option, index) => (
        <React.Fragment key={option.field}>
          {index > 0 ? <Text dimColor> · </Text> : null}
          <Text
            color={option.field === props.active ? "cyan" : undefined}
            bold={option.field === props.active}
            underline={option.field === props.active}
          >
            {option.label}
          </Text>
          <Text dimColor>({option.key})</Text>
        </React.Fragment>
      ))}
    </Text>
  );
}

export function PlotTab(props: PlotTabProps) {
  const { plotPins, plotPinFill, presetInputOpen, presetInput, presetListOpen } = useAppState();
  const [presets, setPresets] = React.useState<
    Record<string, { slugs: string[]; y?: YField; x?: XField }>
  >({});
  const narrow = isNarrow(props.width);
  const plotWidth = Math.max(40, Math.min(narrow ? props.width - 4 : 60, props.width - 4));
  const plotHeight = narrow ? 16 : 22;

  const ySpec = Y_OPTIONS.find((option) => option.field === props.yField) ?? Y_OPTIONS[0]!;
  const xSpec = X_OPTIONS.find((option) => option.field === props.xField) ?? X_OPTIONS[0]!;
  const chartTitle = `${ySpec.label} vs ${xSpec.label} (log X, top 25 by intel)`;

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
            ...(preset.x !== undefined ? { plotX: preset.x } : {}),
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
    if (input === "$") {
      setState({ plotX: "index_run_cost" });
      void persistPlotPins();
      return;
    }
    if (input === "o") {
      setState({ plotX: "output_price" });
      void persistPlotPins();
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
    x: props.xField,
    colorize: !props.ascii,
    pinSlugs: usingPins ? plotPins : undefined,
    pinFill: plotPinFill,
  });

  const presetNames = Object.keys(presets);

  return (
    <Box flexDirection="column">
      <Text bold>{chartTitle}</Text>
      <AxisPicker label="Y" options={Y_OPTIONS} active={props.yField} />
      <AxisPicker label="X" options={X_OPTIONS} active={props.xField} />
      <Text dimColor>
        {usingPins
          ? `${plotPins.length} pinned${plotPinFill ? " + fill" : " only"} · f toggle fill`
          : "legend sorted by Y ↓"}{" "}
        · ★ band leaders · s save · l load · ? keys
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
