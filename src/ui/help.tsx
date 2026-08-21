import { Box, Text } from "ink";
import React from "react";
import type { TabId } from "./store.js";

interface HelpSection {
  title: string;
  bindings: readonly (readonly [string, string])[];
}

const GLOBAL_SECTIONS: readonly HelpSection[] = [
  {
    title: "Navigation",
    bindings: [
      ["Tab / Shift+Tab", "next / previous tab"],
      ["1 2 3 4", "jump to Models / Plot / Compare / Media"],
      ["← →", "previous / next tab"],
    ],
  },
  {
    title: "App",
    bindings: [
      ["r", "refresh data"],
      ["?", "toggle this help"],
      ["esc", "close overlays"],
      ["q", "quit"],
    ],
  },
];

const TAB_SECTIONS: Record<TabId, readonly HelpSection[]> = {
  models: [
    {
      title: "Browse",
      bindings: [
        ["↑ / ↓", "move selection"],
        ["/", "search models"],
        ["enter", "open detail card"],
      ],
    },
    {
      title: "Sort",
      bindings: [["i c v $ s d", "intel / code / value / idx$ / speed / date"]],
    },
    {
      title: "Plot pins",
      bindings: [
        ["p / space", "toggle pin on selected model"],
        ["P", "pin all visible rows"],
        ["C", "clear all pins"],
      ],
    },
  ],
  plot: [
    {
      title: "Axes",
      bindings: [
        ["i c a t", "Y: intel / coding / agentic / speed"],
        ["$ o", "X: index-run cost / output price"],
      ],
    },
    {
      title: "Selection",
      bindings: [["f", "toggle pinned-only vs pinned + fill"]],
    },
    {
      title: "Presets",
      bindings: [
        ["s", "save current pins as preset"],
        ["l", "load saved preset"],
      ],
    },
  ],
  compare: [],
  media: [
    {
      title: "Arena",
      bindings: [
        ["[  ]", "previous / next arena type"],
        [",  .", "previous / next arena (alt)"],
      ],
    },
    {
      title: "Browse",
      bindings: [["↑ / ↓", "move selection"]],
    },
  ],
};

function HelpSectionBlock(props: { section: HelpSection }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        {props.section.title}
      </Text>
      {props.section.bindings.map(([key, action]) => (
        <Text key={`${props.section.title}-${key}`}>
          <Text bold>{key.padEnd(14)}</Text>
          <Text>{action}</Text>
        </Text>
      ))}
    </Box>
  );
}

export function Help(props: { tab?: TabId }) {
  const tab = props.tab ?? "models";
  const tabSections = TAB_SECTIONS[tab];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>keyboard shortcuts</Text>
      <Text> </Text>
      {tabSections.length > 0 ? (
        <>
          <Text dimColor>This tab</Text>
          {tabSections.map((section) => (
            <HelpSectionBlock key={section.title} section={section} />
          ))}
          <Text dimColor>Everywhere</Text>
        </>
      ) : null}
      {GLOBAL_SECTIONS.map((section) => (
        <HelpSectionBlock key={section.title} section={section} />
      ))}
    </Box>
  );
}
