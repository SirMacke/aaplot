# aaplot — the Artificial Analysis website, in your terminal

Unofficial TUI dashboard for [Artificial Analysis](https://artificialanalysis.ai) data: cost vs intelligence quadrant charts, ranked model tables, comparisons, and media arena leaderboards — all navigable by keyboard. No browser.

Name: **aaplot** (npm + PyPI verified free). Binary: `aaplot`. Reads "A-A plot": plots of AA data. README states "unofficial, not affiliated with Artificial Analysis."

## What it is

A full-screen TUI (Terminal User Interface) — the kind of app `lazygit`, `htop`, and `k9s` are. Not a one-shot command that prints and exits: persistent panels, tabs, arrow-key/Vim navigation, live re-render on refresh.

Competitor check: [aneym/artificial-analysis-cli](https://github.com/aneym/artificial-analysis-cli) (Rust, 1 star) already covers one-shot tables, filters, compare, `--json`, and media rankings across every AA endpoint. Plain tables are not a differentiator. aaplot wins on:

1. **Charts** — terminal scatter quadrants with median quadrant lines ("cheap + smart" at a glance). The website's flagship chart, in-terminal.
2. **TUI** — the whole site navigable by keyboard: Models / Plot / Compare / Media tabs.
3. **MCP server** — same repo, second binary, for agent access.

## Stack: TypeScript + ink

Chosen over Python (original idea) because:

- npm-native publishing; `npx aaplot` = zero-install.
- One runtime — no "Python required" surprise for npm users.
- ink (React for terminals) is the strongest TUI ecosystem.
- The chart renderer becomes a plain TS module reusable by the Twitch tool (JS-world).
- Zod replaces pydantic for schema validation.

Deps: `ink`, `react`, `zod`, `env-paths` (config/cache dirs). Tests: `vitest`. Build: `tsup`. Node >= 18, ESM, strict TS.

### Testing

- Recorded API responses as fixtures; client mocked in tests (never hit the network in CI).
- Golden-file tests for the plot renderer (exact text output for a known dataset).
- CI matrix: ubuntu + macos + windows from day 1 — cross-platform demo-perfect is a v1 requirement; terminal charset/layout bugs are platform-specific.
- `--demo` mode injects synthetic fixture data: keyless preview, README GIFs, and tests without burning the 100 req/day quota. Synthetic only; shipping real AA data would breach redistribution terms.

## API facts that shape the design

Verified against the API docs, Aug 2026.

| Fact | Detail | Consequence |
|---|---|---|
| Auth | Every request needs `x-api-key`. No anonymous access | Onboarding screen in the TUI; no way around the key |
| Free endpoint | `GET /api/v2/language/models/free` (`/language/models` is Pro+ and 403s on free keys) | Free tier is the default mode |
| Free fields | Name, slug, creator, release date, Intelligence/Coding/Agentic indices, median speed/latency, input/output/cache pricing, index-run cost | Enough for the flagship quadrant chart |
| Not free | Per-benchmark scores, blended pricing, percentiles, context window, params, modalities (Pro, 500 req/day) | `--pro` mode in v1.1 unlocks richer views when a Pro key exists |
| Free media endpoints | TTS, image, video, music arenas — ELO + CI rankings | Media tab is free scope |
| Rate limit | 100 req/day, fixed 24h window, shared org-wide. Headers: `X-RateLimit-Limit/Remaining/Reset`, `X-AA-Tier` | 24h cache is mandatory; quota shown in footer |
| Pagination | `page_size=200`, ~2 pages (~400 language models) | Client pages once and caches the merged dataset |
| Perf-over-time | Commercial only | `watch` mode: commercial keys only, stretch |
| Attribution | Required at all tiers: visible byline/footer | Footer on every screen + README credit |
| Index versioning | Intelligence Index v4.1; scores change meaning across majors | Print index version next to scores |
| Errors | 400/401/403/404/429/500, JSON `error`, `Retry-After` on 429 | Friendly messages; backoff on 500 |

### Value metric (free tier only)

No blended pricing on free, but `artificial_analysis_intelligence_index_cost.total_cost` (dollar cost of one full index run) is exposed. Value = `intelligence_index / total_cost` — a metric the website doesn't show and the competitor doesn't compute. Default sort.

## Scope: the website in terminal

Tabs (left-right or number keys), each a panel:

- **Models** — sortable table (intel / code / value / cost / speed / release). `/` filter, `--creator`/`--min-quality`/`--max-cost`/`--cheap` presets. Enter → detail card (all free fields).
- **Plot** — the centerpiece. Quadrant scatter: X = $/1M output tokens (log), Y = Intelligence Index or speed (tokens/s) or coding index. Median quadrant lines + corner labels. Letter markers + legend (see risks). Default `--top 25`, sorted by **intelligence** so all four quadrants stay populated (value-sort clusters left and empties "pricey + smart"); `--sort value` available. Models-table default sort stays value.
- **Compare** — side-by-side rows for chosen slugs.
- **Media** — arena ELO tables: TTS / image / video / img2vid / music.
- **Help** — `?` overlay with keybindings.

Global: footer with rate-limit remaining, index version, data freshness ("updated Xh ago"), attribution ("Data: Artificial Analysis — artificialanalysis.ai"). `r` refreshes (quota-aware). First-run screen: paste API key (or `AA_API_KEY` env var), stored in user config dir.

Error states: 429 → "quota exhausted, resets in Xh" countdown (from `Retry-After`); offline → cached mode with stale-data banner; 403 → tier notice explaining what the key tier unlocks; 401 → back to onboarding.

Layout: responsive — full layout at >120 cols, stacked panels in narrow terminals. `--ascii` fallback for legacy consoles.

Key storage: plaintext JSON in the user config dir (0600 on POSIX, ACL note on Windows). Documented tradeoff — OS keychain adds a native dep for marginal gain; keys are free and revocable.

One-shot modes preserved for scripting:

```
aaplot              # launches the TUI
aaplot models --json
aaplot plot --json  # prints the quadrant chart to stdout
aaplot compare gpt-5 claude-opus-4-7 --json
```

## Architecture

Single npm package, two bins: `aaplot` (TUI, v1.0) and `aaplot-mcp` (MCP server, v1.1). Both share the core modules — MCP needs no separate repo because it's just another entry point over the same client/cache.

```
aaplot/
  package.json
  src/
    bin/
      aaplot.ts        # TUI entry
      aaplot-mcp.ts    # MCP server entry (v1.1)
    api/
      client.ts        # auth header, paging, rate-limit capture, retries
      schemas.ts       # zod models for /free + media endpoints
    core/
      cache.ts         # JSON-per-endpoint cache, 24h TTL, --offline
      config.ts        # API key storage, env-paths
      metrics.ts       # value metric, medians, sorters
    render/
      plot.ts          # braille quadrant scatter (pure text output — reusable by Twitch tool)
      chart.ts         # bar/line charts
    ui/
      app.tsx          # ink root, tab routing
      tabs/
        models.tsx     # table + detail card
        plot.tsx       # quadrant chart panel
        compare.tsx
        media.tsx
        onboarding.tsx # key setup screen
    mcp/                # v1.1: MCP server tools (models, plot, compare)
  tests/
```

Key design points:

- The plot renderer takes data + options and returns plain text (ANSI). The TUI wraps it in an ink `<Text>` component; the `--json`/one-shot path prints it straight. One module, three consumers (TUI, CLI stdout, MCP).
- Cache: one file per endpoint+params, TTL 24h aligned to the fixed rate window. Store `X-RateLimit-*` headers alongside. `r` refreshes only stale or explicitly requested entries.
- Windows: user demos on Windows. Braille needs a VT-capable terminal — use braille on Windows Terminal (`WT_SESSION`) and VS Code (`TERM_PROGRAM=vscode`); ASCII fallback (`.`, `o`, `+`) on `TERM=dumb` or other Windows consoles, or on `--ascii`.
- Schema leniency: numeric fields `.nullable()` (docs: nulls mean "not measured", never zero) and cache prices `.optional()` — strict schemas would crash on real free-tier nulls.

## Publishing route

1. **npm** (primary): unscoped `aaplot` package, `bin: { aaplot, aaplot-mcp }`. Install: `npx aaplot` or `npm i -g aaplot`. Publish 0.0.1 early to claim the name.
2. **GitHub**: public repo + Actions — vitest + tsc on PR (ubuntu + macos + windows matrix), publish to npm on `v*` tag (OIDC/provenance). Conventional commits + release automation (changesets). README with a vhs-recorded GIF (record on macOS/Linux or WSL), badges, demo screenshot.
3. **Homebrew tap + Scoop bucket** (later, if traction): Homebrew is macOS/Linux (`brew install aaplot` from a git tap); Scoop is the Windows equivalent (`scoop install aaplot` from a bucket). Both let users install without npm. Skip until there's demand.
4. PyPI: not planned. A Python user can `npm i -g aaplot`; a separate Python port would double the maintenance for no audience gain.
5. MIT license. README credits Artificial Analysis and links attribution terms.

## Release cadence

Conventional commits + changesets, from commit 1:

- Commit messages: `feat:`, `fix:`, `chore:`, `docs:` prefixes — machine-readable.
- Every PR carries a changeset note (patch/minor/major + one-line description). On merge, the changesets GitHub Action opens a "Version Packages" PR that bumps the version and writes CHANGELOG.md; merging it runs `npm publish` on the new tag.
- This produces a tidy public release history with zero manual versioning — the maintenance signal a public repo wants.

## MCP

Post-launch (v1.1): second bin (`aaplot-mcp`) in the same repo. Headless stdio server exposing `models`, `plot`, `compare` tools over the same cached client — so an agent gets AA data without burning the 100 req/day quota. No separate repo: it would fork the API client and cache code for nothing.

## Build order

| Phase | Work | Estimate |
|---|---|---|
| 0 | Scaffold (npm, tsconfig strict, eslint, vitest, CI), zod schemas, API client, cache, config/key storage | 0.5 day |
| 1 | **Plot renderer spike** — braille quadrant scatter, median lines, log axis, labels. Flagship first; validate readability on Windows Terminal | 1 day |
| 2 | TUI shell (ink): tab routing, footer, onboarding screen, keybindings | 1 day |
| 3 | Models tab: table, sorters, filters, detail card | 1 day |
| 4 | Plot tab wired to live data; Compare + Media tabs | 1 day |
| 5 | One-shot CLI modes + `--json` | 0.5 day |
| 6 | Polish: colors, vhs-recorded README GIF, publish to npm, Homebrew/Scoop later | 0.5 day |
| 7 | v1.1: MCP bin, `--pro` mode (per-benchmark scores, blended pricing) | later |

## Risks and decisions

- **ink churn** — ink ships breaking changes across majors (v4→v5→v6). Pin the major in package.json; the API surface used (Text/Box/useInput/useApp) is stable across them.
- **400 points on one plot** — braille canvas at ~100x30 cells can't show everything. Default `--top 25` + filtering; full dataset always available via the Models tab and `--json`.
- **Label collision** — near-identical coordinates overwrite each other. Mitigation: jitter + marker legend with model list beside the plot; hovering in a later iteration.
- **Org-wide rate limit** — one free key = 100 req/day for everything. Cache correctness beats feature count. Quota in footer.
- **API drift** — zod models fail loudly on schema changes; error screens suggest updating.
- **No-key onboarding** — first run has zero data; onboarding screen must make getting a free key a <1-minute detour (link + paste box).
- **ToS** — never scrape the website, never ship bundled datasets, never share keys. Everything stays local and per-user.

## Out of scope for now

- Redistribution: free/Pro tiers are internal-use only. No hosted cache, no public dataset snapshots.
- Per-benchmark charts (GPQA, HLE...): Pro-only, gated behind `--pro`.
- `watch` (performance-over-time): Commercial-only.
- Providers, coding agents, AI trends: no free-tier public endpoints (providers are Commercial); the website sections stay on the website.
