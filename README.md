# wc3_build_timings

This project contains JS scripts to do the following:

- Collect match data from W3Champions by defined race and league placement
- Downloads all replays associated with matches pulled
- Parses all replays in a folder and stores match data to a local SQLite db for further processing

Parsing is accomplished using w3gjs (https://github.com/PBug90/w3gjs). Minor changes made include capturing pause/unpause actions.

## New pipeline entry points

Install dependencies first:

```bash
npm install
```

### 1) Download replays from SQL query output

The SQL query in [`data/match_id.sql`](data/match_id.sql) should return a single URL column such as:

`https://website-backend.w3champions.com/api/replays/<match_id>`

Run:

```bash
node download_replays_from_sqlite.js --db <path-to-your-sqlite-db>
```

Optional:

```bash
node download_replays_from_sqlite.js \
  --db <path-to-your-sqlite-db> \
  --sql data/match_id.sql \
  --out replays \
  --concurrency 16 \
  --retries 4 \
  --timeout-ms 30000
```

Downloaded files are saved under `replays/`.

### 2) Parse replay files into SQLite

Run:

```bash
node parse_replays_to_sqlite.js
```

Optional:

```bash
node parse_replays_to_sqlite.js \
  --replays replays \
  --db data/replay_analysis.db \
  --id-map data/wc3_ids.csv \
  --concurrency 8 \
  --flush-size 5000 \
  --min-duration-ms 180000
```

Tables created:

- `game_summary`
- `action_summary`
- `prod_order`
- `prod_summary`

## Plan

Implementation plan is documented in [`PROJECT_PLAN.md`](PROJECT_PLAN.md).
