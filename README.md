# aaplot

Unofficial terminal dashboard for [Artificial Analysis](https://artificialanalysis.ai) model data — cost vs intelligence quadrant charts, rankings, side-by-side compares, and media arena ELOs. Not affiliated with Artificial Analysis.

Requires **Node.js 20+**.

## Install

```
npm i -g aaplot
aaplot
```

Or run without installing:

```
npx aaplot
```

Preview without an API key:

```
aaplot --demo
```

## API key

Every live request needs a free key from [artificialanalysis.ai/data-api](https://artificialanalysis.ai/data-api) (100 requests/day, shared per organisation).

Set `AA_API_KEY`, or paste the key on first run. aaplot stores it as plaintext JSON in the user config directory (`env-paths` name `aaplot`): `%APPDATA%\aaplot-nodejs\Config` on Windows, `~/.config/aaplot-nodejs` on Linux, `~/Library/Preferences/aaplot-nodejs` on macOS. POSIX files are mode `0600`. On Windows there is no extra ACL step — the file inherits your user-profile permissions. Keys are free and revocable.

## Usage

```
aaplot                 # TUI
aaplot --demo          # synthetic data, no key, no quota
aaplot --ascii         # ASCII plot markers (no braille)
aaplot --offline       # cached data only
aaplot --creator openai --min-quality 40 --cheap
aaplot --help
```

In the TUI: `1`–`4` jump Models / Plot / Compare / Media, `?` keybindings, `r` refresh (quota-aware; bypasses a fresh cache), `q` or `ctrl+c` quit.

Pin models on Models (`p` / space) to drive both the Plot pin set and the Compare table. Compare marks the winner of each metric with ★.

Braille plots need a VT-capable terminal. **Windows Terminal** and **VS Code** use braille automatically. Other Windows consoles and `TERM=dumb` fall back to ASCII; `--ascii` forces that everywhere.

## Scripting (one-shot modes)

Print and exit instead of opening the TUI. Each mode prints a plain-text view by default and JSON with `--json`. They share the TUI's cache and key, so a cached dataset costs no quota.

```
aaplot models [--sort intel|code|value|cost|speed|release] [--top n] [--json]
aaplot plot [--y intelligence|coding|agentic|speed] [--x index-run-cost|output-price]
            [--sort intelligence|coding|agentic|speed|value] [--top n]
            [--width n] [--height n] [--ascii] [--json]
aaplot compare <slug> <slug>... [--json]
```

`--creator`, `--min-quality`, `--max-cost`, `--cheap`, `--offline` and `--demo` work with every mode. Examples:

```
aaplot models --demo --top 5
aaplot models --creator openai --json | jq '.models[].slug'
aaplot plot --y coding --x output-price
aaplot compare gpt-5 claude-opus-4-7 --json
```

- `models` defaults to value sort (intelligence ÷ index-run cost), all rows.
- `plot` prints the quadrant chart with its full legend (default top 25 by intelligence). Colour is used only on a TTY and never when `NO_COLOR` is set. `--json` returns the plotted points, medians and each point's quadrant instead of the chart.
- `compare` marks the best model per metric with ★; `--json` lists each metric's values and `winners`. An unknown slug exits 1.
- JSON fields are flat snake_case (`intelligence_index`, `index_run_cost`, `price_1m_output_tokens`, …). Missing values are `null`, never 0. Every JSON document carries `attribution`, `source` (`demo` / `live` / `cache`), `index_version`, `updated_at` and `stale`.
- Exit codes: 0 success, 1 data or lookup error (no key, offline with no cache, unknown slug), 2 usage error.

## Data and attribution

Data: [Artificial Analysis](https://artificialanalysis.ai). Licensed under their [API terms](https://artificialanalysis.ai/data-api/docs). Footer on every screen credits them.

`--demo` and tests use synthetic fixtures only. aaplot does not scrape the website or ship Artificial Analysis datasets.

## License

MIT
