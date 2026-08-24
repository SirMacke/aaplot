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

## Data and attribution

Data: [Artificial Analysis](https://artificialanalysis.ai). Licensed under their [API terms](https://artificialanalysis.ai/data-api/docs). Footer on every screen credits them.

`--demo` and tests use synthetic fixtures only. aaplot does not scrape the website or ship Artificial Analysis datasets.

## License

MIT
