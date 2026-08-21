import { Box, Text } from "ink";
import React from "react";

export interface PlaceholderProps {
  title: string;
  note: string;
  modelCount: number;
}

export function Placeholder(props: PlaceholderProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{props.title}</Text>
      <Text dimColor>{props.note}</Text>
      {props.modelCount > 0 ? <Text>{props.modelCount} models loaded</Text> : null}
    </Box>
  );
}
