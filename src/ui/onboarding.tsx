import { Box, Text, useInput } from "ink";
import React from "react";

export interface OnboardingProps {
  error: string | null;
  onSubmit: (apiKey: string) => void;
}

export function Onboarding(props: OnboardingProps) {
  const [draft, setDraft] = React.useState("");
  useInput((input, key) => {
    if (key.escape) return;
    if (key.return || input === "\r" || input === "\n") {
      setDraft((current) => {
        const trimmed = current.trim();
        if (trimmed !== "") props.onSubmit(trimmed);
        return current;
      });
      return;
    }
    if (key.backspace || key.delete) {
      setDraft((current) => current.slice(0, -1));
      return;
    }
    if (input.length > 0 && !key.ctrl && !key.meta && input !== "\r" && input !== "\n") {
      setDraft((current) => current + input);
    }
  });

  const masked = draft === "" ? "" : `${"•".repeat(draft.length)}`;
  return (
    <Box flexDirection="column">
      <Text bold>aaplot — Artificial Analysis in your terminal</Text>
      <Text> </Text>
      <Text>Every request needs a free API key (100 requests/day, shared per organisation).</Text>
      <Text>
        Get one at <Text color="cyan">https://artificialanalysis.ai/data-api</Text>
      </Text>
      <Text dimColor>You can also set the AA_API_KEY environment variable to skip this screen.</Text>
      <Text> </Text>
      <Text>Paste your key, then press enter:</Text>
      <Text color="cyan">{masked}</Text>
      {props.error !== null ? <Text color="red">{props.error}</Text> : null}
      <Text> </Text>
      <Text dimColor>enter save · backspace edit · ctrl+c quit</Text>
    </Box>
  );
}
