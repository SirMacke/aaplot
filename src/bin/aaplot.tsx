#!/usr/bin/env node
import { parseArgs, shouldUseAscii, USAGE } from "../ui/args.js";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (args.error !== null) {
  process.stderr.write(`aaplot: ${args.error}\nRun aaplot --help for usage.\n`);
  process.exit(2);
}

if (args.command !== "tui") {
  const { runOneShot } = await import("../ui/oneshot.js");
  process.exitCode = await runOneShot(args, { stdout: process.stdout, stderr: process.stderr });
} else {
  const [{ render }, React, { default: App }] = await Promise.all([
    import("ink"),
    import("react"),
    import("../ui/app.js"),
  ]);
  render(
    React.createElement(App, {
      demo: args.demo,
      offline: args.offline,
      ascii: shouldUseAscii(args.ascii),
      creator: args.creator,
      minQuality: args.minQuality,
      maxCost: args.maxCost,
      cheap: args.cheap,
    }),
    {
      alternateScreen: true,
      exitOnCtrlC: true,
    },
  );
}
