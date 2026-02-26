"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();
const DEFAULT_DB_PATH =
  "C:\\Users\\abou6\\OneDrive\\Documents\\workspace\\stats-visual\\data\\w3c-cache.sqlite";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const eq = token.indexOf("=");
    if (eq !== -1) {
      const key = token.slice(2, eq);
      const value = token.slice(eq + 1);
      args[key] = value;
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms, ratio = 0.25) {
  const spread = Math.max(0, Math.floor(ms * ratio));
  const offset = Math.floor((Math.random() * 2 - 1) * spread);
  return Math.max(0, ms + offset);
}

function parseRetryAfterMs(value) {
  if (!value) {
    return null;
  }
  const numeric = Number.parseInt(String(value), 10);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric * 1000;
  }
  const dateMs = Date.parse(String(value));
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function createRateLimiter(minRequestIntervalMs) {
  let chain = Promise.resolve();
  let nextAllowedAt = Date.now();

  return {
    async waitTurn() {
      if (!minRequestIntervalMs || minRequestIntervalMs <= 0) {
        return;
      }
      const ticket = chain.then(async () => {
        const now = Date.now();
        const waitMs = Math.max(0, nextAllowedAt - now);
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        nextAllowedAt = Date.now() + minRequestIntervalMs;
      });
      chain = ticket.catch(() => {});
      await ticket;
    },
  };
}

function openReadOnlyDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function dbAll(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function closeDb(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function getReplayUrlsFromSql(dbPath, sqlPath) {
  const sql = await fsp.readFile(sqlPath, "utf8");
  const db = await openReadOnlyDb(dbPath);
  try {
    const rows = await dbAll(db, sql);
    const urls = new Set();
    for (const row of rows) {
      const value = Object.values(row)[0];
      if (typeof value === "string" && value.startsWith("http")) {
        urls.add(value.trim());
      }
    }
    return [...urls];
  } finally {
    await closeDb(db);
  }
}

function isRetryable(err) {
  if (err && typeof err.status === "number") {
    return err.status === 429 || err.status >= 500;
  }
  const code = err && err.code ? String(err.code) : "";
  const name = err && err.name ? String(err.name) : "";
  return (
    name === "AbortError" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "EAI_AGAIN"
  );
}

async function fetchReplayBuffer(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Unexpected HTTP status ${response.status}`);
      error.status = response.status;
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = parseRetryAfterMs(retryAfter);
      if (retryAfterMs !== null) {
        error.retryAfterMs = retryAfterMs;
      }
      throw error;
    }
    const payload = await response.arrayBuffer();
    return Buffer.from(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function replayFilePath(outDir, url) {
  try {
    const parsed = new URL(url);
    const replayId = path.basename(parsed.pathname);
    return path.join(outDir, `${replayId}.w3g`);
  } catch {
    const fallback = Buffer.from(url).toString("base64url");
    return path.join(outDir, `${fallback}.w3g`);
  }
}

async function downloadOne(
  url,
  outDir,
  retries,
  timeoutMs,
  rateLimiter,
  attemptDelayMs,
) {
  const destination = replayFilePath(outDir, url);
  try {
    await fsp.access(destination, fs.constants.F_OK);
    return { status: "skipped", file: destination };
  } catch {
    // file is not present
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await rateLimiter.waitTurn();
      const data = await fetchReplayBuffer(url, timeoutMs);
      const partial = `${destination}.part`;
      await fsp.writeFile(partial, data);
      await fsp.rename(partial, destination);
      return { status: "downloaded", file: destination };
    } catch (err) {
      const shouldRetry = attempt < retries && isRetryable(err);
      if (!shouldRetry) {
        throw err;
      }
      const retryAfterMs =
        Number.isFinite(err.retryAfterMs) && err.retryAfterMs >= 0
          ? err.retryAfterMs
          : 0;
      const expBackoffMs = Math.min(attemptDelayMs * 2 ** (attempt - 1), 30000);
      const waitMs = jitter(Math.max(retryAfterMs, expBackoffMs));
      await sleep(waitMs);
    }
  }

  throw new Error("Retries exhausted");
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (true) {
          const currentIndex = index;
          index += 1;
          if (currentIndex >= items.length) {
            return;
          }
          await worker(items[currentIndex], currentIndex);
        }
      })(),
    );
  }
  await Promise.all(workers);
}

function usage() {
  console.log(
    [
      "Usage:",
      `node download_replays_from_sqlite.js [--db <path-to-sqlite-db>] [--sql data/match_id.sql] [--out replays] [--concurrency 4] [--retries 6] [--timeout-ms 30000] [--attempt-delay-ms 1500] [--min-request-interval-ms 150] [--preview-count 5] [--preview-only]`,
      `Default --db: ${DEFAULT_DB_PATH}`,
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const dbPath = args.db || DEFAULT_DB_PATH;
  const sqlPath = args.sql || path.join(__dirname, "data", "match_id.sql");
  const outDir = args.out || path.join(__dirname, "data", "replays");
  const concurrency = toInt(args.concurrency, 4);
  const retries = toInt(args.retries, 6);
  const timeoutMs = toInt(args["timeout-ms"], 30000);
  const attemptDelayMs = toInt(args["attempt-delay-ms"], 1500);
  const minRequestIntervalMs = toInt(args["min-request-interval-ms"], 150);
  const previewCount = toInt(args["preview-count"], 0);
  const previewOnly = args["preview-only"] === "true";
  const rateLimiter = createRateLimiter(minRequestIntervalMs);

  if (!dbPath) {
    usage();
    throw new Error("--db is required");
  }

  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node.js 18+.");
  }

  await fsp.mkdir(outDir, { recursive: true });

  console.log(`Loading replay URLs from ${sqlPath}`);
  const urls = await getReplayUrlsFromSql(dbPath, sqlPath);
  console.log(`Found ${urls.length} unique replay URLs`);

  if (previewCount > 0) {
    const firstN = urls.slice(0, previewCount);
    console.log(`Previewing first ${firstN.length} replay API calls:`);
    firstN.forEach((url, idx) => {
      console.log(`${idx + 1}. ${url}`);
    });
  }

  if (previewOnly) {
    console.log("Preview-only mode enabled; exiting before download.");
    return;
  }

  console.log(
    `Downloader settings | concurrency=${concurrency} retries=${retries} min-request-interval-ms=${minRequestIntervalMs} attempt-delay-ms=${attemptDelayMs}`,
  );

  const failed = [];
  const counters = {
    downloaded: 0,
    skipped: 0,
    failed: 0,
  };

  await runPool(urls, concurrency, async (url, idx) => {
    try {
      const result = await downloadOne(
        url,
        outDir,
        retries,
        timeoutMs,
        rateLimiter,
        attemptDelayMs,
      );
      counters[result.status] += 1;
    } catch (err) {
      counters.failed += 1;
      failed.push(`${url}\t${err.message}`);
    }

    const done = idx + 1;
    if (done % 100 === 0 || done === urls.length) {
      console.log(
        `Progress ${done}/${urls.length} | downloaded=${counters.downloaded} skipped=${counters.skipped} failed=${counters.failed}`,
      );
    }
  });

  if (failed.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const failurePath = path.join(
      __dirname,
      "data",
      `download_failures_${stamp}.log`,
    );
    await fsp.writeFile(failurePath, `${failed.join("\n")}\n`, "utf8");
    console.log(`Failure log: ${failurePath}`);
  }

  console.log(
    `Completed | total=${urls.length} downloaded=${counters.downloaded} skipped=${counters.skipped} failed=${counters.failed}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
