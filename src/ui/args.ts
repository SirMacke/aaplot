import { MODEL_SORT_FIELDS, type ModelSortField } from "../core/models-table.js";
import type { SortField, XField, YField } from "../render/plot.js";

export type CliCommand = "tui" | "models" | "plot" | "compare";

export interface CliArgs {
  command: CliCommand;
  demo: boolean;
  ascii: boolean;
  offline: boolean;
  creator: string | null;
  minQuality: number | null;
  maxCost: number | null;
  cheap: boolean;
  help: boolean;
  json: boolean;
  slugs: string[];
  sort: ModelSortField | null;
  plotSort: SortField | null;
  top: number | null;
  y: YField | null;
  x: XField | null;
  width: number | null;
  height: number | null;
  error: string | null;
}

export const USAGE = `aaplot — unofficial Artificial Analysis TUI

Usage:
  aaplot [options]                      launch the TUI
  aaplot models [options] [--json]      print the ranked models table
  aaplot plot [options] [--json]        print the quadrant chart
  aaplot compare <slug>... [--json]     print a side-by-side compare

Options:
  --demo              keyless preview with synthetic data
  --ascii             ASCII plot markers (no braille)
  --offline           use cached data only; never hit the network
  --creator <name>    filter Models to this creator
  --min-quality <n>   hide models below this Intelligence Index
  --max-cost <n>      hide models above this index-run cost (USD)
  --cheap             only models at or below the median output price
  -h, --help          show this help

One-shot options (models / plot / compare):
  --json              machine-readable JSON on stdout
  --top <n>           models: limit rows (default all) · plot: points (default 25)
  --sort <field>      models: intel|code|value|cost|speed|release (default value)
                      plot: intelligence|coding|agentic|speed|value (default intelligence)
  --y <field>         plot Y axis: intelligence|coding|agentic|speed (default intelligence)
  --x <field>         plot X axis: index-run-cost|output-price (default index-run-cost)
  --width <n>         plot canvas width in cells (default 60)
  --height <n>        plot canvas height in rows (default fits the legend)

Keys (in the TUI): 1-4 tabs · ? help · r refresh · q quit

API key: set AA_API_KEY, or paste it on first run.
Stored at the user config dir (plaintext JSON). POSIX files are 0600;
on Windows the file inherits your user profile ACL.

Braille plots need Windows Terminal or VS Code's terminal. Other Windows
consoles (and TERM=dumb) fall back to ASCII automatically; --ascii forces it.

Data: Artificial Analysis — artificialanalysis.ai
Unofficial; not affiliated with Artificial Analysis.
`;

const COMMANDS: readonly CliCommand[] = ["models", "plot", "compare"];
const Y_FIELDS: readonly YField[] = ["intelligence", "coding", "agentic", "speed"];
const PLOT_SORT_FIELDS: readonly SortField[] = [...Y_FIELDS, "value"];
const X_FIELD_ALIASES: Record<string, XField> = {
  "index-run-cost": "index_run_cost",
  index_run_cost: "index_run_cost",
  "output-price": "output_price",
  output_price: "output_price",
};

function positiveInteger(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "tui",
    demo: false,
    ascii: false,
    offline: false,
    creator: null,
    minQuality: null,
    maxCost: null,
    cheap: false,
    help: false,
    json: false,
    slugs: [],
    sort: null,
    plotSort: null,
    top: null,
    y: null,
    x: null,
    width: null,
    height: null,
    error: null,
  };
  const fail = (message: string) => {
    if (args.error === null) args.error = message;
  };
  let sortValue: string | null = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === "--demo") args.demo = true;
    else if (arg === "--ascii") args.ascii = true;
    else if (arg === "--offline") args.offline = true;
    else if (arg === "--cheap") args.cheap = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--creator") {
      const value = argv[index + 1];
      if (value !== undefined && value !== "") {
        args.creator = value;
        index++;
      }
    } else if (arg === "--min-quality" || arg === "--max-cost") {
      const value = argv[index + 1];
      const given = value !== undefined && !value.startsWith("--") ? value : undefined;
      const parsed = given === undefined || given.trim() === "" ? NaN : Number(given);
      if (!Number.isFinite(parsed)) {
        fail(
          given === undefined ? `${arg} needs a number` : `${arg} needs a number, got "${given}"`,
        );
        if (given !== undefined) index++;
        continue;
      }
      if (arg === "--min-quality") args.minQuality = parsed;
      else args.maxCost = parsed;
      index++;
    } else if (arg === "--top" || arg === "--width" || arg === "--height") {
      const parsed = positiveInteger(argv[index + 1]);
      if (parsed === null) {
        fail(`${arg} needs a positive integer`);
        continue;
      }
      index++;
      if (arg === "--top") args.top = parsed;
      else if (arg === "--width") args.width = parsed;
      else args.height = parsed;
    } else if (arg === "--sort") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("-")) {
        fail("--sort needs a field");
        continue;
      }
      sortValue = value;
      index++;
    } else if (arg === "--y") {
      const value = argv[index + 1];
      const field = Y_FIELDS.find((candidate) => candidate === value);
      if (field === undefined) {
        fail(`--y must be one of ${Y_FIELDS.join("|")}`);
        continue;
      }
      args.y = field;
      index++;
    } else if (arg === "--x") {
      const value = argv[index + 1];
      const field = value === undefined ? undefined : X_FIELD_ALIASES[value];
      if (field === undefined) {
        fail("--x must be one of index-run-cost|output-price");
        continue;
      }
      args.x = field;
      index++;
    } else if (arg.startsWith("-")) {
      fail(`unknown option ${arg}`);
    } else if (args.command === "tui") {
      const command = COMMANDS.find((candidate) => candidate === arg);
      if (command === undefined) fail(`unknown command ${arg}`);
      else args.command = command;
    } else if (args.command === "compare") {
      args.slugs.push(arg);
    } else {
      fail(`unexpected argument ${arg}`);
    }
  }

  if (sortValue !== null) {
    if (args.command === "models") {
      const field = MODEL_SORT_FIELDS.find((candidate) => candidate === sortValue);
      if (field === undefined) fail(`--sort must be one of ${MODEL_SORT_FIELDS.join("|")}`);
      else args.sort = field;
    } else if (args.command === "plot") {
      const field = PLOT_SORT_FIELDS.find((candidate) => candidate === sortValue);
      if (field === undefined) fail(`--sort must be one of ${PLOT_SORT_FIELDS.join("|")}`);
      else args.plotSort = field;
    } else {
      fail("--sort applies to models and plot only");
    }
  }
  if (args.json && args.command === "tui") fail("--json needs a command: models, plot, or compare");
  if (args.command === "compare" && args.slugs.length === 0 && !args.help) {
    fail("compare needs at least one model slug");
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
