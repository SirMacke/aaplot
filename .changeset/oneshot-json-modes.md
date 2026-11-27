---
"aaplot": minor
---

Add one-shot scripting modes: `aaplot models`, `aaplot plot` and `aaplot compare <slug>...` print a text view and exit, and `--json` prints machine-readable output. Plot JSON gives each point a display `quadrant` label and a stable `quadrant_id` (`cheap_high`, `pricey_high`, `cheap_low`, `pricey_low`). Unknown options and commands, and non-numeric `--min-quality` / `--max-cost` values, now exit with a usage error instead of being ignored. The filter flags apply to `models` and `plot`; `compare` shows exactly the slugs given.
