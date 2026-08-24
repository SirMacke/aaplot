import { Box, Text, useInput } from "ink";
import React from "react";
import type { ArenaEntry, MediaArenaKind } from "../../api/schemas.js";
import { mediaArenaPaths } from "../../api/schemas.js";
import { mediaTableLayout } from "../../core/media-table.js";
import { isNarrow, listViewport } from "../logic.js";
import { setState } from "../store.js";

export interface MediaTabProps {
  arenas: Partial<Record<MediaArenaKind, ArenaEntry[]>>;
  arena: MediaArenaKind;
  selectedIndex: number;
  width: number;
  demo: boolean;
  onLoadArena?: (kind: MediaArenaKind) => void;
}

export const MEDIA_ARENA_KINDS = Object.keys(mediaArenaPaths) as MediaArenaKind[];

export const MEDIA_ARENA_LABELS: Record<MediaArenaKind, string> = {
  tts: "TTS",
  image: "Image",
  video: "Video",
  img2vid: "Img2Vid",
  "music-instrumental": "Music (inst)",
  "music-vocals": "Music (vocals)",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

function cycleArena(current: MediaArenaKind, direction: 1 | -1): MediaArenaKind {
  const index = MEDIA_ARENA_KINDS.indexOf(current);
  const next = MEDIA_ARENA_KINDS[(index + direction + MEDIA_ARENA_KINDS.length) % MEDIA_ARENA_KINDS.length];
  return next ?? "tts";
}

function ArenaSwitcher(props: { arena: MediaArenaKind; narrow: boolean }) {
  const arenaIndex = MEDIA_ARENA_KINDS.indexOf(props.arena);
  const prevLabel = MEDIA_ARENA_LABELS[cycleArena(props.arena, -1)] ?? "";
  const nextLabel = MEDIA_ARENA_LABELS[cycleArena(props.arena, 1)] ?? "";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text dimColor>arena </Text>
        <Text bold color="cyan">
          ‹
        </Text>
        <Text dimColor> {prevLabel} </Text>
        <Text bold color="cyan" underline>
          {MEDIA_ARENA_LABELS[props.arena]}
        </Text>
        <Text dimColor> {nextLabel} </Text>
        <Text bold color="cyan">
          ›
        </Text>
        <Text dimColor>
          {" "}
          ({arenaIndex + 1}/{MEDIA_ARENA_KINDS.length}) · [ ] switch · ↑↓ browse
        </Text>
      </Text>
      {!props.narrow ? (
        <Text>
          {MEDIA_ARENA_KINDS.map((kind, index) => (
            <React.Fragment key={kind}>
              {index > 0 ? <Text dimColor> · </Text> : null}
              <Text
                color={kind === props.arena ? "cyan" : undefined}
                bold={kind === props.arena}
                underline={kind === props.arena}
              >
                {MEDIA_ARENA_LABELS[kind]}
              </Text>
            </React.Fragment>
          ))}
        </Text>
      ) : null}
    </Box>
  );
}

export function MediaTab(props: MediaTabProps) {
  const narrow = isNarrow(props.width);
  const entries = [...(props.arenas[props.arena] ?? [])].sort((left, right) => right.elo - left.elo);
  const selectedIndex = entries.length === 0 ? 0 : Math.min(props.selectedIndex, entries.length - 1);
  const visibleCount = narrow ? 10 : 16;
  const { start: viewStart, end: viewEnd } = listViewport(selectedIndex, entries.length, visibleCount);
  const visibleRows = entries.slice(viewStart, viewEnd);
  const { creatorWidth, slugWidth } = mediaTableLayout(narrow);

  React.useEffect(() => {
    if (props.demo) return;
    if ((props.arenas[props.arena] ?? []).length > 0) return;
    props.onLoadArena?.(props.arena);
  }, [props.demo, props.arena, props.arenas, props.onLoadArena]);

  useInput((input, key) => {
    if (input === "[" || input === ",") {
      setState({ mediaArena: cycleArena(props.arena, -1), mediaSelectedIndex: 0 });
      return;
    }
    if (input === "]" || input === ".") {
      setState({ mediaArena: cycleArena(props.arena, 1), mediaSelectedIndex: 0 });
      return;
    }
    if (key.upArrow) {
      setState({ mediaSelectedIndex: Math.max(0, selectedIndex - 1) });
      return;
    }
    if (key.downArrow) {
      setState({ mediaSelectedIndex: Math.min(entries.length - 1, selectedIndex + 1) });
    }
  });

  return (
    <Box flexDirection="column">
      <ArenaSwitcher arena={props.arena} narrow={narrow} />
      <Text dimColor>
        {entries.length} models ranked by ELO · Tab/1-4 switch tabs · ? keys
      </Text>
      <Text> </Text>
      <Box flexDirection="column">
        <Text bold>
          {`${"".padEnd(1)}` +
            (creatorWidth > 0 ? "Creator".padEnd(creatorWidth) : "") +
            `${"Slug".padEnd(slugWidth)}` +
            `${"Elo".padStart(6)} ` +
            (narrow ? "" : `${"CI±".padStart(5)}`)}
        </Text>
        {entries.length === 0 ? (
          <Text dimColor>no arena data loaded — press r to refresh</Text>
        ) : (
          visibleRows.map((entry, index) => {
            const rowIndex = viewStart + index;
            const marker = rowIndex === selectedIndex ? "▶" : " ";
            const ci = entry.ci_95 === null ? "—" : `±${entry.ci_95.toFixed(0)}`;
            const line =
              `${marker}` +
              (creatorWidth > 0
                ? truncate(entry.model_creator.name, creatorWidth - 1).padEnd(creatorWidth)
                : "") +
              `${truncate(entry.slug, slugWidth - 1).padEnd(slugWidth)}` +
              `${entry.elo.toFixed(0).padStart(6)} ` +
              (narrow ? "" : `${ci.padStart(5)}`);
            return (
              <Text key={entry.id} inverse={rowIndex === selectedIndex}>
                {line}
              </Text>
            );
          })
        )}
        {entries.length > visibleCount ? (
          <Text dimColor>
            {viewStart + 1}-{viewEnd} of {entries.length}
            {viewEnd < entries.length ? " · ↓ more below" : ""}
            {viewStart > 0 ? " · ↑ more above" : ""}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
