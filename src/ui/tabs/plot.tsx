import { Box, Text, useInput } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import { renderModelsQuadrant, type YField } from "../../render/plot.js";
import { isNarrow } from "../logic.js";
import { setState } from "../store.js";

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
  const narrow = isNarrow(props.width);
  const plotWidth = Math.max(40, Math.min(narrow ? props.width - 4 : 60, props.width - 4));
  const plotHeight = narrow ? 16 : 22;

  useInput((input) => {
    const nextY: Record<string, YField> = {
      i: "intelligence",
      c: "coding",
      a: "agentic",
      t: "speed",
    };
    const field = nextY[input];
    if (field !== undefined) setState({ plotY: field });
  });

  const plot = renderModelsQuadrant(props.models, {
    ascii: props.ascii,
    width: plotWidth,
    height: plotHeight,
    top: 25,
    sortBy: "intelligence",
    y: props.yField,
    colorize: !props.ascii,
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Y: {Y_LABELS[props.yField]} · i/c/a/t switch axis · top 25 · colors by lab · ? keys
      </Text>
      <Text>{plot}</Text>
    </Box>
  );
}
