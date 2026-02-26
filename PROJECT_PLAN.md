# Project Plan

## Goal
Build a reliable high-volume pipeline that:
1. Reads replay download URLs from `data/match_id.sql`.
2. Downloads replay files into `data/replays/`.
3. Parses replay files safely at scale and stores structured output in SQLite.

## Scope
- Add a SQL-driven replay downloader with bounded concurrency and retries.
- Add a parser pipeline with:
  - bounded file-level concurrency,
  - one parser instance per file,
  - single-writer SQLite batching/transactions,
  - fixed extraction logic issues identified in review.
- Update docs with runnable commands.

## Deliverables
- `download_replays_from_sqlite.js`
- `parse_replays_to_sqlite.js`
- README usage updates

## Execution Steps
1. Download Stage
   - Read SQL from `data/match_id.sql`.
   - Execute SQL against a user-provided SQLite DB.
   - Normalize and deduplicate replay URLs.
   - Download into `data/replays/` with retry + timeout + skip-existing behavior.

2. Parse Stage
   - Recursively scan `data/replays/` for `.w3g`.
   - Parse with bounded concurrency and per-file parser instances.
   - Transform replay output into:
     - `game_summary`
     - `action_summary`
     - `prod_order`
     - `prod_summary`
   - Flush rows in chunks with transactions to reduce lock contention.

3. Verification Stage
   - Validate downloader summary:
     - total URLs, downloaded, skipped, failed.
   - Validate parser summary:
     - total files, parsed, failed.
   - Review failure logs and rerun only failed items.

## Notes
- This plan intentionally keeps old scripts intact and adds new production-ready entry points.
- For very large runs (30k+), start with moderate concurrency and benchmark:
  - downloader: 16-32
  - parser: `max(2, CPU cores - 1)` and tune

