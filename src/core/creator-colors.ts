const CREATOR_PALETTE: Readonly<Record<string, number>> = {
  openai: 39,
  anthropic: 208,
  google: 220,
  meta: 33,
  mistral: 214,
  deepseek: 45,
  alibaba: 203,
  qwen: 203,
  microsoft: 39,
  amazon: 214,
  cohere: 205,
  xai: 196,
  nvidia: 82,
  apple: 245,
  ibm: 33,
  perplexity: 45,
};

export const ANSI_RESET = "\x1b[0m";

function normalizeCreator(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashColor(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index++) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return 37 + (hash % 196);
}

export function creatorColorIndex(creatorName: string): number {
  const normalized = normalizeCreator(creatorName);
  for (const [needle, color] of Object.entries(CREATOR_PALETTE)) {
    if (normalized.includes(needle)) return color;
  }
  return hashColor(normalized);
}

export function creatorAnsi(creatorName: string, bold = false): string {
  const color = creatorColorIndex(creatorName);
  return bold ? `\x1b[1;38;5;${color}m` : `\x1b[38;5;${color}m`;
}

export function colorizeText(text: string, creatorName: string, bold = false): string {
  return `${creatorAnsi(creatorName, bold)}${text}${ANSI_RESET}`;
}

export function creatorSwatch(creatorName: string): string {
  const color = creatorColorIndex(creatorName);
  return `\x1b[48;5;${color}m  ${ANSI_RESET}`;
}
