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

// Hex brand colors for truecolor terminals.
const CREATOR_RGB: Readonly<Record<string, readonly [number, number, number]>> = {
  openai: [16, 163, 127], // #10A37F
  anthropic: [204, 120, 50], // #CC7832
  google: [66, 133, 244], // #4285F4
  meta: [8, 102, 255], // #0866FF
  mistral: [255, 107, 53], // #FF6B35
  deepseek: [77, 163, 255], // #4DA3FF
  alibaba: [255, 106, 0], // #FF6A00
  qwen: [255, 106, 0],
  microsoft: [0, 120, 212], // #0078D4
  amazon: [255, 153, 0], // #FF9900
  cohere: [57, 50, 139], // #39328B
  xai: [255, 59, 48], // #FF3B30
  nvidia: [118, 185, 0], // #76B900
  apple: [170, 170, 170], // #AAAAAA
  ibm: [15, 98, 254], // #0F62FE
  perplexity: [32, 128, 141], // #20808D
};

export const ANSI_RESET = "\x1b[0m";
export const ANSI_UNDERLINE = "\x1b[4m";
export const ANSI_UNDERLINE_OFF = "\x1b[24m";

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

function hashRgb(key: string): readonly [number, number, number] {
  let hash = 0;
  for (let index = 0; index < key.length; index++) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  const saturation = 55 + (hash % 25);
  const lightness = 45 + (hash % 20);
  return hslToRgb(hue, saturation, lightness);
}

function hslToRgb(h: number, s: number, l: number): readonly [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = light - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [chroma, x, 0];
  else if (h < 120) [r, g, b] = [x, chroma, 0];
  else if (h < 180) [r, g, b] = [0, chroma, x];
  else if (h < 240) [r, g, b] = [0, x, chroma];
  else if (h < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  return [
    Math.round((r + match) * 255),
    Math.round((g + match) * 255),
    Math.round((b + match) * 255),
  ];
}

export function terminalSupportsTruecolor(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR !== undefined) return false;
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return true;
  if (env.TERM_PROGRAM === "vscode" || env.TERM_PROGRAM === "Apple_Terminal") return true;
  if (env.WT_SESSION !== undefined) return true;
  return false;
}

export function creatorColorIndex(creatorName: string): number {
  const normalized = normalizeCreator(creatorName);
  for (const [needle, color] of Object.entries(CREATOR_PALETTE)) {
    if (normalized.includes(needle)) return color;
  }
  return hashColor(normalized);
}

export function creatorRgb(creatorName: string): readonly [number, number, number] {
  const normalized = normalizeCreator(creatorName);
  for (const [needle, rgb] of Object.entries(CREATOR_RGB)) {
    if (normalized.includes(needle)) return rgb;
  }
  return hashRgb(normalized);
}

export function creatorAnsi(creatorName: string, bold = false): string {
  if (terminalSupportsTruecolor()) {
    const [r, g, b] = creatorRgb(creatorName);
    return bold ? `\x1b[1;38;2;${r};${g};${b}m` : `\x1b[38;2;${r};${g};${b}m`;
  }
  const color = creatorColorIndex(creatorName);
  return bold ? `\x1b[1;38;5;${color}m` : `\x1b[38;5;${color}m`;
}

export function colorizeText(
  text: string,
  creatorName: string,
  bold = false,
  underline = false,
): string {
  const prefix = creatorAnsi(creatorName, bold);
  const underlineOn = underline ? ANSI_UNDERLINE : "";
  return `${prefix}${underlineOn}${text}${ANSI_RESET}`;
}

export function creatorSwatch(creatorName: string): string {
  if (terminalSupportsTruecolor()) {
    const [r, g, b] = creatorRgb(creatorName);
    return `\x1b[48;2;${r};${g};${b}m  ${ANSI_RESET}`;
  }
  const color = creatorColorIndex(creatorName);
  return `\x1b[48;5;${color}m  ${ANSI_RESET}`;
}
