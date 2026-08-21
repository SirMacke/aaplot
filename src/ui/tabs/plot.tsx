import { Box, Text } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import { renderModelsQuadrant } from "../../render/plot.js";
import { isNarrow } from "../logic.js";

export interface PlotTabProps {
  models: FreeModel[];
  ascii: boolean;
  width: number;
}

export function PlotTab(props: PlotTabProps) {
  const narrow = isNarrow(props.width);
  const plotWidth = Math.max(40, Math.min(narrow ? props.width - 4 : 60, props.width - 4));
  const plotHeight = narrow ? 16 : 22;
  const plot = renderModelsQuadrant(props.models, {
    ascii: props.ascii,
    width: plotWidth,
    height: plotHeight,
    top: 25,
    sortBy: "intelligence",
  });
  return (
    <Box flexDirection="column">
      <Text dimColor>cost vs intelligence · top 25 by intel · r refresh</Text>
      <Text>{plot}</Text>
    </Box>
  );
}
