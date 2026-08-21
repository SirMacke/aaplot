import { Box, Text, useInput } from "ink";
import React from "react";
import type { FreeModel } from "../../api/schemas.js";
import {
  MODEL_COL_WIDTH,
  MODEL_SORT_KEYS,
  activeFilterLabels,
  columnGap,
  formatColumnHeader,
  formatCurrency,
  formatNumber,
  formatRelease,
  formatSortStatus,
  modelTableLayout,
  prepareModelTable,
  type ModelSortField,
} from "../../core/models-table.js";
import { horizontalBar } from "../../render/chart.js";
import { isNarrow, listViewport } from "../logic.js";
import { persistPlotPins } from "../pin-persistence.js";
import { setState, useAppState, type ModelFilters } from "../store.js";
import { normalizePlotPins, togglePlotPin } from "../../core/plot-pins.js";

export interface ModelsTabProps {
  models: FreeModel[];
  filters: ModelFilters;
  sort: ModelSortField;
  sortAsc: boolean;
  selectedIndex: number;
  detailOpen: boolean;
  searchOpen: boolean;
  width: number;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

function DetailCard(props: { model: FreeModel }) {
  const model = props.model;
  const value = formatNumber(
    model.evaluations.artificial_analysis_intelligence_index !== null &&
      model.artificial_analysis_intelligence_index_cost.total_cost !== null &&
      model.artificial_analysis_intelligence_index_cost.total_cost > 0
      ? model.evaluations.artificial_analysis_intelligence_index /
          model.artificial_analysis_intelligence_index_cost.total_cost
      : null,
  );
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} marginBottom={1}>
      <Text bold>{model.name}</Text>
      <Text dimColor>
        {model.slug} · {model.model_creator.name}
      </Text>
      <Text> </Text>
      <Text>
        release {formatRelease(model.release_date)} · intel {formatNumber(model.evaluations.artificial_analysis_intelligence_index)} · code{" "}
        {formatNumber(model.evaluations.artificial_analysis_coding_index)} · agentic{" "}
        {formatNumber(model.evaluations.artificial_analysis_agentic_index)}
      </Text>
      <Text>
        value {value} · index-run cost {formatCurrency(model.artificial_analysis_intelligence_index_cost.total_cost)}
      </Text>
      <Text>
        input {formatCurrency(model.pricing.price_1m_input_tokens)} · output{" "}
        {formatCurrency(model.pricing.price_1m_output_tokens)}
        {model.pricing.price_1m_cache_hit_tokens !== undefined
          ? ` · cache hit ${formatCurrency(model.pricing.price_1m_cache_hit_tokens)}`
          : ""}
      </Text>
      <Text>
        speed {formatNumber(model.performance.median_output_tokens_per_second, 0)} tok/s · ttft{" "}
        {formatNumber(model.performance.median_time_to_first_token_seconds, 2)}s · e2e{" "}
        {formatNumber(model.performance.median_end_to_end_response_time_seconds, 2)}s
      </Text>
      <Text> </Text>
      <Text>{horizontalBar("intel", model.evaluations.artificial_analysis_intelligence_index)}</Text>
      <Text>{horizontalBar("code", model.evaluations.artificial_analysis_coding_index)}</Text>
      <Text>{horizontalBar("agentic", model.evaluations.artificial_analysis_agentic_index)}</Text>
      <Text>
        {horizontalBar(
          "speed",
          model.performance.median_output_tokens_per_second,
          { max: 500, digits: 0 },
        )}
      </Text>
      <Text dimColor>enter or esc close</Text>
    </Box>
  );
}

const SORT_KEY_MAP: Record<string, ModelSortField> = {
  i: "intel",
  c: "code",
  v: "value",
  $: "cost",
  s: "speed",
  d: "release",
};

export function ModelsTab(props: ModelsTabProps) {
  const plotPins = useAppState().plotPins;
  const narrow = isNarrow(props.width);
  const rows = prepareModelTable(props.models, props.filters, props.sort, props.sortAsc);
  const selectedIndex = rows.length === 0 ? 0 : Math.min(props.selectedIndex, rows.length - 1);
  const selected = rows[selectedIndex] ?? null;
  const filterLabels = activeFilterLabels(props.filters);
  const sortStatus = formatSortStatus(props.sort, props.sortAsc);

  useInput((input, key) => {
    if (props.detailOpen) {
      if (key.return || key.escape) setState({ detailOpen: false });
      return;
    }
    if (props.searchOpen) {
      if (key.escape) {
        setState({ searchOpen: false, filters: { ...props.filters, query: "" }, selectedIndex: 0 });
        return;
      }
      if (key.backspace || key.delete) {
        const query = props.filters.query.slice(0, -1);
        setState({ filters: { ...props.filters, query }, selectedIndex: 0 });
        return;
      }
      if (key.return) {
        setState({ searchOpen: false });
        return;
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        setState({
          filters: { ...props.filters, query: props.filters.query + input },
          selectedIndex: 0,
        });
      }
      return;
    }
    if (input === "/") {
      setState({ searchOpen: true });
      return;
    }
    if (key.upArrow) {
      setState({ selectedIndex: Math.max(0, selectedIndex - 1) });
      return;
    }
    if (key.downArrow) {
      setState({ selectedIndex: Math.min(rows.length - 1, selectedIndex + 1) });
      return;
    }
    if (input === "p" || input === " ") {
      if (selected === null) return;
      const nextPins = togglePlotPin(plotPins, selected.slug);
      setState({ plotPins: nextPins });
      void persistPlotPins();
      return;
    }
    if (input === "P") {
      const visibleSlugs = rows.map((model) => model.slug);
      setState({ plotPins: normalizePlotPins([...plotPins, ...visibleSlugs]) });
      void persistPlotPins();
      return;
    }
    if (input === "C") {
      setState({ plotPins: [] });
      void persistPlotPins();
      return;
    }
    if (key.return && selected !== null) {
      setState({ detailOpen: true });
      return;
    }
    const nextSort = SORT_KEY_MAP[input];
    if (nextSort !== undefined) {
      setState({
        sort: nextSort,
        sortAsc: nextSort === props.sort ? !props.sortAsc : false,
        selectedIndex: 0,
      });
    }
  });

  const { slugWidth, creatorWidth } = modelTableLayout(props.width, narrow);
  const visibleCount = narrow ? 12 : 18;
  const { start: viewStart, end: viewEnd } = listViewport(selectedIndex, rows.length, visibleCount);
  const visibleRows = rows.slice(viewStart, viewEnd);

  const gap = columnGap();
  const header =
    `${"".padEnd(2)}` +
    (creatorWidth > 0 ? "Creator".padEnd(creatorWidth) : "") +
    `${"Slug".padEnd(slugWidth)}` +
    formatColumnHeader("intel", props.sort, props.sortAsc) +
    gap +
    (narrow ? "" : formatColumnHeader("code", props.sort, props.sortAsc) + gap) +
    formatColumnHeader("value", props.sort, props.sortAsc) +
    gap +
    (narrow ? "" : formatColumnHeader("cost", props.sort, props.sortAsc) + gap) +
    (narrow ? "" : formatColumnHeader("speed", props.sort, props.sortAsc) + gap) +
    (narrow ? "" : formatColumnHeader("release", props.sort, props.sortAsc));

  return (
    <Box flexDirection="column">
      <Text dimColor>
        {rows.length}/{props.models.length} · sorted by {sortStatus}
        {plotPins.length > 0 ? ` · ${plotPins.length} pinned` : ""}
        {filterLabels.length > 0 ? ` · ${filterLabels.join(" · ")}` : ""}
        {!props.searchOpen ? ` · sort: ${Object.values(MODEL_SORT_KEYS).join(" ")} · ? keys` : ""}
      </Text>
      {props.searchOpen ? (
        <Text>
          search: <Text color="cyan">{props.filters.query}</Text>
          <Text dimColor> esc cancel · enter done</Text>
        </Text>
      ) : null}
      <Text> </Text>
      <Box flexDirection="column">
        <Text bold>{header}</Text>
        {rows.length === 0 ? (
          <Text dimColor>no models match the current filters</Text>
        ) : (
          visibleRows.map((model, index) => {
            const rowIndex = viewStart + index;
            const marker = rowIndex === selectedIndex ? "▶" : " ";
            const pin = plotPins.includes(model.slug) ? "*" : " ";
            const intel = formatNumber(model.evaluations.artificial_analysis_intelligence_index);
            const code = formatNumber(model.evaluations.artificial_analysis_coding_index);
            const value = formatNumber(
              model.evaluations.artificial_analysis_intelligence_index !== null &&
                model.artificial_analysis_intelligence_index_cost.total_cost !== null &&
                model.artificial_analysis_intelligence_index_cost.total_cost > 0
                ? model.evaluations.artificial_analysis_intelligence_index /
                    model.artificial_analysis_intelligence_index_cost.total_cost
                : null,
            );
            const cost = formatCurrency(model.artificial_analysis_intelligence_index_cost.total_cost);
            const speed = formatNumber(model.performance.median_output_tokens_per_second, 0);
            const release = formatRelease(model.release_date);
            const line =
              `${marker}${pin}` +
              (creatorWidth > 0
                ? truncate(model.model_creator.name, creatorWidth - 1).padEnd(creatorWidth)
                : "") +
              `${truncate(model.slug, slugWidth - 1).padEnd(slugWidth)}` +
              `${intel.padStart(MODEL_COL_WIDTH.intel)}${gap}` +
              `${narrow ? "" : `${code.padStart(MODEL_COL_WIDTH.code)}${gap}`}` +
              `${value.padStart(MODEL_COL_WIDTH.value)}${gap}` +
              `${narrow ? "" : `${cost.padStart(MODEL_COL_WIDTH.cost)}${gap}`}` +
              `${narrow ? "" : `${speed.padStart(MODEL_COL_WIDTH.speed)}${gap}`}` +
              `${narrow ? "" : release.padStart(MODEL_COL_WIDTH.release)}`;
            return (
              <Text key={model.id} inverse={rowIndex === selectedIndex && !props.detailOpen}>
                {line}
              </Text>
            );
          })
        )}
        {rows.length > visibleCount ? (
          <Text dimColor>
            {viewStart + 1}-{viewEnd} of {rows.length}
            {viewEnd < rows.length ? " · ↓ more below" : ""}
            {viewStart > 0 ? " · ↑ more above" : ""}
          </Text>
        ) : null}
      </Box>
      {props.detailOpen && selected !== null ? <DetailCard model={selected} /> : null}
    </Box>
  );
}
