import { Box, Text, useInput } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import {
  buildCompareRows,
  clampCompareOffset,
  COMPARE_RULE,
  compareLayout,
  formatCompareCell,
  resolveCompareModels,
} from "../../core/compare-table.js";
import { persistPlotPins } from "../pin-persistence.js";
import { setState, useAppState } from "../store.js";

export interface CompareTabProps {
  models: FreeModel[];
  width: number;
}

const COMPARE_GROUP_BREAKS = new Set(["creator", "e2e", "output_price"]);

export function CompareTab(props: CompareTabProps) {
  const { plotPins, compareOffset } = useAppState();
  const resolved = resolveCompareModels(props.models, plotPins);
  const { labelWidth, colWidth, visible } = compareLayout(props.width, resolved.length);
  const offset = clampCompareOffset(compareOffset, resolved.length, visible);
  const end = offset + visible;
  const canPage = resolved.length > visible;
  const rows = buildCompareRows(resolved);

  useInput((input) => {
    if (input === "[" || input === ",") {
      setState({
        compareOffset: clampCompareOffset(offset - 1, resolved.length, visible),
      });
      return;
    }
    if (input === "]" || input === ".") {
      setState({
        compareOffset: clampCompareOffset(offset + 1, resolved.length, visible),
      });
      return;
    }
    if (input === "C") {
      if (plotPins.length === 0) return;
      setState({ plotPins: [], compareOffset: 0 });
      void persistPlotPins();
    }
  });

  if (resolved.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>Compare</Text>
        <Text dimColor>
          pin models on the Models tab (p / space), then come back here for a side-by-side view
        </Text>
        <Text dimColor>★ marks the winner of each metric · C clears pins · ? keys</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>
        {resolved.length} pinned · ★ best on each row
        {canPage ? ` · ${offset + 1}-${end} of ${resolved.length} · [ ] more columns` : ""}
        {" · C clear pins · ? keys"}
      </Text>
      <Text> </Text>
      <Box>
        <Text dimColor>
          {"".padEnd(labelWidth)}
          {COMPARE_RULE}
        </Text>
        {resolved.slice(offset, end).map((model) => (
          <Text key={model.id} bold>
            {formatCompareCell(model.slug, colWidth, false, "left")}
          </Text>
        ))}
      </Box>
      {rows.map((row, index) => (
        <React.Fragment key={row.id}>
          <Box>
            <Text dimColor>
              {row.label.padEnd(labelWidth)}
              {COMPARE_RULE}
            </Text>
            {row.cells.slice(offset, end).map((cell, cellIndex) => {
              const formatted = formatCompareCell(cell.text, colWidth, cell.winner, cell.align);
              const key = `${row.id}-${resolved[offset + cellIndex]?.id ?? cellIndex}`;
              return cell.winner ? (
                <Text key={key} color="green" bold>
                  {formatted}
                </Text>
              ) : (
                <Text key={key}>{formatted}</Text>
              );
            })}
          </Box>
          {COMPARE_GROUP_BREAKS.has(row.id) && index < rows.length - 1 ? <Text> </Text> : null}
        </React.Fragment>
      ))}
    </Box>
  );
}
