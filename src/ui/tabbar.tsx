import { Box, Text } from "ink";
import React from "react";
import { TABS, isNarrow } from "./logic.js";
import type { TabId } from "./store.js";

function tabLabel(tab: TabId): string {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

export function TabBar(props: { active: TabId; width: number }) {
  const narrow = isNarrow(props.width);
  return (
    <Box>
      {TABS.map((tab, index) => {
        const name = tabLabel(tab);
        const label = narrow ? name : `${index + 1} ${name}`;
        return (
          <React.Fragment key={tab}>
            <Text> </Text>
            {tab === props.active ? (
              <Text inverse>{label}</Text>
            ) : (
              <Text dimColor>{label}</Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
