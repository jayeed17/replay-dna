# Replay DNA

**Spotify Wrapped, but better: my listening history, analyzed in-browser.**

Drop your Spotify data export into the page and get a swipeable, Wrapped-style story plus a full
dashboard, all computed locally with DuckDB-WASM.

> 🔒 **Your data never leaves your browser.** Files are read with the File API and queried by an
> in-browser SQL engine. There is no server, no upload, no analytics, no cookies.

![Story mode](docs/screenshots/story.png)
<!-- screenshot placeholder: docs/screenshots/story.png (a few story cards side by side) -->

![Dashboard](docs/screenshots/dashboard.png)
<!-- screenshot placeholder: docs/screenshots/dashboard.png (full dashboard, desktop) -->

![Exported IG story](docs/screenshots/export.png)
<!-- screenshot placeholder: docs/screenshots/export.png (one exported 1080×1920 card) -->

**[Try the demo →](https://replay-dna.vercel.app)** <!-- update once deployed --> It ships with a fake listener, so no data needed.

## What you get

**Story mode** (swipe, ← →, or tap), every card exportable as a **1080×1920 PNG** for Instagram Stories:

| Card | What it shows |
|---|---|
| Total minutes | minutes, days of music, plays, listening days |
| Top artists | top 5 by minutes |
| Top songs | top 5 **by plays**, with plays + minutes |
| Your sound | top genres and how many you explored (needs `genres.json`) |
| Listening clock | 24-hour rose chart, peak hour, night-owl % |
| Biggest day | your single heaviest day and who dominated it |
| The gap | months you went quiet (vs. your usual minutes/day) |
| Obsession of the year | the most plays of one song inside a single week |
| vs Wrapped 2025 | this export vs last year's Wrapped numbers |
| Summary | the year in six stats + your Wrapped superfan percentile |

**Dashboard:** monthly minutes · artist share over time · genre share over time · hour × weekday
heatmap · discovery rate · skip-proxy rate. Every chart has hover tooltips and a table view.

## Use it with your data

1. Request your data at **spotify.com → Account → Privacy settings → Download your data**
   ("Account data", ~5 days). You'll get a zip.
2. Unzip it and drop the **`Spotify Account Data`** folder onto the page.
3. Optional: add genres (see below) by dropping `genres.json` in with the folder.

Only these files are ever opened, matched by name: `StreamingHistory_music_*.json`,
`Wrapped<year>.json`, `TasteProfile.json`, `YourLibrary.json`, `genres.json`.
Everything else in the export (payments, address, identity, location, …) is skipped unread.
Podcasts and audiobooks are ignored.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (loaders, data prep, gap detection)
npm run build
npm run sample     # regenerate the fake demo data in public/sample/
```

## Genres (optional Python pipeline)

Spotify's export doesn't include genres, so `pipeline/genres.py` fetches each artist's top
[Last.fm](https://www.last.fm/api) tags, normalizes them (merges `hip-hop`/`hip hop`, drops junk
like `seen live`, splits decades into an `era` field) and writes `data/derived/genres.json`.

```bash
cp .env.example .env            # add LASTFM_API_KEY
python3 pipeline/genres.py      # stdlib only, cached, ~4 req/s
```

Artists with no usable tags are listed in `data/derived/untagged.txt`; fill them by hand in
`data/derived/genres_overrides.json` (format: `pipeline/genres_overrides.example.json`), then
`python3 pipeline/genres.py --offline`. Details: [`pipeline/README.md`](pipeline/README.md).

> The pipeline runs on your machine, not in the browser, and **sends artist names (only) to
> Last.fm**. Everything under `data/` is gitignored.

## Definitions

- **Play** = a stream of **≥ 30 s**. Shorter streams count toward the **skip-proxy rate**
  (Spotify's basic export has no real skip flag).
- **Minutes** include all music streams, skips too.
- **Discovery rate** = % of a month's minutes on artists first heard that month. The first month
  is a baseline (everything is "new") and is left out.
- **The gap** = the deepest run of months below 50% of your median minutes-per-day, normalized for
  partial months at the edges of the export.
- **Times**: Spotify stores UTC; the app converts to your browser's timezone (changeable in the top bar).
- **vs Wrapped 2025**: Wrapped covers ≈ Jan – mid Nov; the export is a rolling 12 months.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · **DuckDB-WASM** (in-browser SQL) · ECharts ·
Framer Motion · html-to-image · Vitest · Python (stdlib) for the genre pipeline.

## Privacy, precisely

| What | Where it goes |
|---|---|
| Your export files | read in your browser tab, never sent anywhere |
| Query results, charts, PNGs | computed in your browser; PNGs are saved/shared only by you |
| DuckDB engine code | served by this site (default), or from `cdn.jsdelivr.net` when built with `VITE_DUCKDB_SOURCE=cdn`. Code only, no data. |
| Artist names | sent to Last.fm **only** if you run the optional Python pipeline yourself |

## Supported sources

All loaders normalize to one schema (`src/loaders/types.ts`):
`ts` (epoch ms, UTC), `artist`, `track`, `album?`, `ms_played`, `skipped?`, `shuffle?`, `platform?`, `source`.

| Loader | Files | Status |
|---|---|---|
| `spotifyBasic` | `StreamingHistory_music_*.json` | ✅ |
| `spotifyExtended` | `endsong_*.json`, `Streaming_History_Audio_*.json` | coming soon |
| `appleMusic` | Apple Music Play Activity `.csv` | coming soon (will fill "the gap") |

Adding one: implement `Loader` (`matches(fileName)` + `parse(text)`) in `src/loaders/` and add it
to the list in `src/loaders/index.ts`.

## Deploy (Vercel)

Import the repo in Vercel; it auto-detects Vite (build `npm run build`, output `dist`). No
`vercel.json` needed. The demo uses `public/sample/`, a deterministic fake dataset.

The default build self-hosts DuckDB's `.wasm` (~35 MB each, ~8 MB gzipped; browsers fetch one).
If the deploy rejects them or they load slowly, set the environment variable
**`VITE_DUCKDB_SOURCE=cdn`** and redeploy (deploy size 74 MB → 2.7 MB).

## Project layout

```
src/loaders/     file detection + normalization (one file per source)
src/analytics/   DuckDB engine, SQL queries, gap detection
src/story/       story cards (1080×1920) and the swipe player
src/dashboard/   charts
src/export/      PNG export / share
pipeline/        Last.fm genre pipeline (Python)
scripts/         fake sample-data generator
public/sample/   fake demo dataset
```
