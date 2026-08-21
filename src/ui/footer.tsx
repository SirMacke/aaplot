import { Text } from "ink";
import React from "react";
import type { RateLimit } from "../api/schemas.js";
import { formatFreshness, formatIndexVersion, formatQuota } from "./logic.js";

export interface FooterProps {
  rateLimit: RateLimit | null;
  storedAt: number | null;
  indexVersion: number | null;
  stale: boolean;
}

export function Footer(props: FooterProps) {
  const now = Date.now();
  const parts = [
    formatQuota(props.rateLimit, now),
    formatFreshness(props.storedAt, now),
    formatIndexVersion(props.indexVersion),
    "Data: Artificial Analysis — artificialanalysis.ai",
  ].filter((part) => part !== "");
  if (props.stale) parts.unshift("offline — cached data");
  return <Text dimColor>{parts.join("  ·  ")}</Text>;
}
