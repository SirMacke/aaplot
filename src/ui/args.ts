export interface CliArgs {
  demo: boolean;
  ascii: boolean;
  offline: boolean;
  creator: string | null;
  minQuality: number | null;
  maxCost: number | null;
  cheap: boolean;
  help: boolean;
}

export const USAGE = `aaplot — unofficial Artificial Analysis TUI

Usage:
  aaplot [options]

Options:
  --demo              keyless preview with synthetic data
  --ascii             ASCII plot markers (no braille)
  --offline           use cached data only; never hit the network
  --creator <name>    filter Models to this creator
  --min-quality <n>   hide models below this Intelligence Index
  --max-cost <n>      hide models above this index-run cost (USD)
  --cheap             shortcut for low index-run cost
  -h, --help          show this help

Keys (in the TUI): 1-4 tabs · ? help · r refresh · q quit

API key: set AA_API_KEY, or paste it on first run.
Stored at the user config dir (plaintext JSON). POSIX files are 0600;
on Windows the file inherits your user profile ACL.

Braille plots need Windows Terminal or VS Code's terminal. Other Windows
consoles (and TERM=dumb) fall back to ASCII automatically; --ascii forces it.

Data: Artificial Analysis — artificialanalysis.ai
Unofficial; not affiliated with Artificial Analysis.
`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    demo: false,
    ascii: false,
    offline: false,
    creator: null,
    minQuality: null,
    maxCost: null,
    cheap: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--demo") args.demo = true;
    else if (arg === "--ascii") args.ascii = true;
    else if (arg === "--offline") args.offline = true;
    else if (arg === "--cheap") args.cheap = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--creator") {
      const value = argv[index + 1];
      if (value !== undefined && value !== "") {
        args.creator = value;
        index++;
      }
    } else if (arg === "--min-quality" || arg === "--max-cost") {
      const value = argv[index + 1];
      const parsed = value === undefined ? NaN : Number(value);
      if (Number.isFinite(parsed)) {
        if (arg === "--min-quality") args.minQuality = parsed;
        else args.maxCost = parsed;
        index++;
      }
    }
  }
  return args;
}

export function shouldUseAscii(
  flag: boolean,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (flag) return true;
  if (env.TERM === "dumb") return true;
  if (platform === "win32") {
    const windowsTerminal = env.WT_SESSION !== undefined && env.WT_SESSION !== "";
    const vsCode = env.TERM_PROGRAM === "vscode";
    return !windowsTerminal && !vsCode;
  }
  return false;
}
