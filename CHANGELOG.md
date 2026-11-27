# aaplot

## 0.1.0

### Minor Changes

- dcadadf: Require Node.js 22 or newer. Node 20 reached end of life in April 2026, and ink 7 already needed Node 22. CI now tests Node 22, 24 and 26. Minor and patch dependency bumps.
- 942588e: Add one-shot scripting modes: `aaplot models`, `aaplot plot` and `aaplot compare <slug>...` print a text view and exit, and `--json` prints machine-readable output. Plot JSON gives each point a display `quadrant` label and a stable `quadrant_id` (`cheap_high`, `pricey_high`, `cheap_low`, `pricey_low`). Unknown options and commands, and non-numeric `--min-quality` / `--max-cost` values, now exit with a usage error instead of being ignored. The filter flags apply to `models` and `plot`; `compare` shows exactly the slugs given.

## 0.0.3

### Patch Changes

- d04338c: Open Plot on intel vs index-run cost instead of restoring last session's axes.

## 0.0.2

### Patch Changes

- 1a99d46: Fix first-run quit, 429 hangs, Media refresh, typecheck, and README for the initial npm release.
