import { Box, Text } from "ink";
import React from "react";
import type { TabId } from "./store.js";

const GLOBAL_BINDINGS: readonly (readonly [string, string])[] = [
  ["←/→ or 1-4", "switch tab"],
  ["r", "refresh data"],
  ["?", "toggle this help"],
  ["esc", "close overlays"],
  ["q", "quit"],
];

const MODELS_BINDINGS: readonly (readonly [string, string])[] = [
  ["/", "search models"],
  ["↑/↓", "move selection"],
  ["enter", "model detail card"],
  ["i c v $ t d", "sort by intel/code/value/cost/speed/release"],
];

const PLOT_BINDINGS: readonly (readonly [string, string])[] = [
  ["i c a t", "Y axis: intel / coding / agentic / speed"],
];

export function Help(props: { tab?: TabId }) {
  const tabBindings =
    props.tab === "models" ? MODELS_BINDINGS : props.tab === "plot" ? PLOT_BINDINGS : [];
  const bindings = [...tabBindings, ...GLOBAL_BINDINGS];
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>keys</Text>
      {bindings.map(([key, action]) => (
        <Text key={key}>
          <Text bold>{key.padEnd(12)}</Text> {action}
        </Text>
      ))}
    </Box>
  );
}
