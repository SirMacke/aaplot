export interface CliArgs {
  demo: boolean;
  ascii: boolean;
  offline: boolean;
  creator: string | null;
  minQuality: number | null;
  maxCost: number | null;
  cheap: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    demo: false,
    ascii: false,
    offline: false,
    creator: null,
    minQuality: null,
    maxCost: null,
    cheap: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--demo") args.demo = true;
    else if (arg === "--ascii") args.ascii = true;
    else if (arg === "--offline") args.offline = true;
    else if (arg === "--cheap") args.cheap = true;
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
