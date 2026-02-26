"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

let W3GReplay;
try {
  W3GReplay = require("w3gjs").default;
} catch {
  W3GReplay = require("./w3gjs/dist/lib").default;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const eq = token.indexOf("=");
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumberArray(value) {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => Number.isFinite(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value)
      .map(Number)
      .filter((item) => Number.isFinite(item));
  }
  return [];
}

function csvSplitLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

async function loadIdLookup(csvPath) {
  const lookup = new Map();
  try {
    const raw = await fsp.readFile(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      const cols = csvSplitLine(line);
      if (cols.length < 2) {
        continue;
      }
      const id = cols[0];
      const name = cols[1];
      if (!id || !name) {
        continue;
      }
      lookup.set(String(id), name);
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    console.warn(`ID map not found at ${csvPath}. Raw IDs will be used.`);
  }
  return lookup;
}

function idToName(id, lookup) {
  if (id === undefined || id === null) {
    return null;
  }
  const key = String(id);
  return lookup.get(key) || key;
}

async function collectReplayFiles(rootDir) {
  const files = [];

  async function walk(currentPath) {
    const entries = await fsp.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".w3g")) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function shouldKeepReplay(result, minDurationMs) {
  const players = safeArray(result.players);
  const hasHeroes = players.some((player) => safeArray(player.heroes).length > 0);
  return (
    (result.type === "1on1" && Number(result.duration) > minDurationMs) ||
    hasHeroes
  );
}

function extractRows(result, sourceFile, lookup, minDurationMs) {
  if (!shouldKeepReplay(result, minDurationMs)) {
    return null;
  }

  const gameRows = [];
  const actionRows = [];
  const prodOrderRows = [];
  const prodSummaryRows = [];
  const players = safeArray(result.players);

  for (const player of players) {
    const heroes = safeArray(player.heroes);
    const actions = player.actions || {};
    let playerResult = null;
    if (typeof result.winningTeamId === "number" && result.winningTeamId >= 0) {
      playerResult = player.teamid === result.winningTeamId ? "won" : "loss";
    }

    gameRows.push([
      result.id,
      result.gamename,
      sourceFile,
      result.version,
      result.map ? result.map.file : null,
      result.type,
      result.duration,
      player.name,
      player.teamid,
      playerResult,
      player.apm,
      player.race,
      player.raceDetected,
      heroes[0] ? idToName(heroes[0].id, lookup) : null,
      heroes[1] ? idToName(heroes[1].id, lookup) : null,
      heroes[2] ? idToName(heroes[2].id, lookup) : null,
      player.color,
    ]);

    actionRows.push([
      result.id,
      player.name,
      Number(actions.ability || 0),
      Number(actions.assigngroup || 0),
      Number(actions.basic || 0),
      Number(actions.buildtrain || 0),
      Number(actions.esc || 0),
      Number(actions.item || 0),
      Number(actions.removeunit || 0),
      Number(actions.rightclick || 0),
      Number(actions.select || 0),
      Number(actions.selecthotkey || 0),
      Number(actions.subgroup || 0),
      Number(actions.pause && actions.pause.summary ? actions.pause.summary : 0),
      Number(
        actions.unpause && actions.unpause.summary ? actions.unpause.summary : 0,
      ),
    ]);

    for (const item of safeArray(player.buildings && player.buildings.order)) {
      prodOrderRows.push([
        result.id,
        player.name,
        "Building",
        idToName(item.id, lookup),
        item.ms,
      ]);
    }
    for (const [id, count] of Object.entries(
      (player.buildings && player.buildings.summary) || {},
    )) {
      prodSummaryRows.push([
        result.id,
        player.name,
        "Building",
        idToName(id, lookup),
        count,
      ]);
    }

    for (const item of safeArray(player.units && player.units.order)) {
      prodOrderRows.push([
        result.id,
        player.name,
        "Unit",
        idToName(item.id, lookup),
        item.ms,
      ]);
    }
    for (const [id, count] of Object.entries(
      (player.units && player.units.summary) || {},
    )) {
      prodSummaryRows.push([
        result.id,
        player.name,
        "Unit",
        idToName(id, lookup),
        count,
      ]);
    }

    for (const item of safeArray(player.upgrades && player.upgrades.order)) {
      prodOrderRows.push([
        result.id,
        player.name,
        "Upgrade",
        idToName(item.id, lookup),
        item.ms,
      ]);
    }
    for (const [id, count] of Object.entries(
      (player.upgrades && player.upgrades.summary) || {},
    )) {
      prodSummaryRows.push([
        result.id,
        player.name,
        "Upgrade",
        idToName(id, lookup),
        count,
      ]);
    }

    for (const item of safeArray(player.items && player.items.order)) {
      prodOrderRows.push([
        result.id,
        player.name,
        "Item",
        idToName(item.id, lookup),
        item.ms,
      ]);
    }
    for (const [id, count] of Object.entries(
      (player.items && player.items.summary) || {},
    )) {
      prodSummaryRows.push([
        result.id,
        player.name,
        "Item",
        idToName(id, lookup),
        count,
      ]);
    }

    for (const ms of toNumberArray(actions.pause && actions.pause.order)) {
      prodOrderRows.push([result.id, player.name, "Action", "Pause", ms]);
    }
    for (const ms of toNumberArray(actions.unpause && actions.unpause.order)) {
      prodOrderRows.push([result.id, player.name, "Action", "Unpause", ms]);
    }

    for (const hero of heroes) {
      for (const ability of safeArray(hero.abilityOrder)) {
        if (ability && ability.type === "ability" && ability.value) {
          prodOrderRows.push([
            result.id,
            player.name,
            "Ability",
            idToName(ability.value, lookup),
            ability.time,
          ]);
        }
      }
      for (const [id, count] of Object.entries(hero.abilities || {})) {
        prodSummaryRows.push([
          result.id,
          player.name,
          "Ability",
          idToName(id, lookup),
          count,
        ]);
      }
    }
  }

  return {
    gameRows,
    actionRows,
    prodOrderRows,
    prodSummaryRows,
  };
}

function openDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function prepare(db, sql) {
  return new Promise((resolve, reject) => {
    let stmt;
    stmt = db.prepare(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(stmt);
      }
    });
  });
}

function stmtRun(stmt, params) {
  return new Promise((resolve, reject) => {
    stmt.run(params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function stmtFinalize(stmt) {
  return new Promise((resolve, reject) => {
    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
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

async function initializeSchema(db) {
  await dbRun(db, "PRAGMA journal_mode=WAL");
  await dbRun(db, "PRAGMA synchronous=NORMAL");
  await dbRun(db, "PRAGMA temp_store=MEMORY");
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS game_summary (
      game_id TEXT NOT NULL,
      game_name TEXT,
      source_file TEXT,
      version TEXT,
      map_file TEXT,
      mode TEXT,
      duration INTEGER,
      player TEXT NOT NULL,
      team_id INTEGER,
      result TEXT,
      apm INTEGER,
      race TEXT,
      race_detected TEXT,
      hero_one TEXT,
      hero_two TEXT,
      hero_three TEXT,
      color TEXT,
      PRIMARY KEY (game_id, player)
    )`,
  );
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS action_summary (
      game_id TEXT NOT NULL,
      player TEXT NOT NULL,
      ability INTEGER,
      assigngroup INTEGER,
      basic INTEGER,
      buildtrain INTEGER,
      esc INTEGER,
      item INTEGER,
      removeunit INTEGER,
      rightclick INTEGER,
      select_count INTEGER,
      selecthotkey INTEGER,
      subgroup INTEGER,
      pause_count INTEGER,
      unpause_count INTEGER,
      PRIMARY KEY (game_id, player)
    )`,
  );
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS prod_order (
      game_id TEXT NOT NULL,
      player TEXT NOT NULL,
      prod_group TEXT NOT NULL,
      prod_name TEXT,
      ms INTEGER
    )`,
  );
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS prod_summary (
      game_id TEXT NOT NULL,
      player TEXT NOT NULL,
      prod_group TEXT NOT NULL,
      prod_name TEXT NOT NULL,
      count INTEGER,
      PRIMARY KEY (game_id, player, prod_group, prod_name)
    )`,
  );
}

function totalBuffered(buffers) {
  return (
    buffers.gameRows.length +
    buffers.actionRows.length +
    buffers.prodOrderRows.length +
    buffers.prodSummaryRows.length
  );
}

function createEmptyBuffers() {
  return {
    gameRows: [],
    actionRows: [],
    prodOrderRows: [],
    prodSummaryRows: [],
  };
}

async function insertMany(db, sql, rows) {
  if (rows.length === 0) {
    return;
  }
  const stmt = await prepare(db, sql);
  try {
    for (const row of rows) {
      await stmtRun(stmt, row);
    }
  } finally {
    await stmtFinalize(stmt);
  }
}

async function flushSnapshot(db, snapshot) {
  if (totalBuffered(snapshot) === 0) {
    return;
  }

  await dbRun(db, "BEGIN IMMEDIATE TRANSACTION");
  try {
    await insertMany(
      db,
      `INSERT OR REPLACE INTO game_summary (
        game_id, game_name, source_file, version, map_file, mode, duration, player, team_id, result, apm, race, race_detected, hero_one, hero_two, hero_three, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      snapshot.gameRows,
    );

    await insertMany(
      db,
      `INSERT OR REPLACE INTO action_summary (
        game_id, player, ability, assigngroup, basic, buildtrain, esc, item, removeunit, rightclick, select_count, selecthotkey, subgroup, pause_count, unpause_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      snapshot.actionRows,
    );

    await insertMany(
      db,
      `INSERT INTO prod_order (
        game_id, player, prod_group, prod_name, ms
      ) VALUES (?, ?, ?, ?, ?)`,
      snapshot.prodOrderRows,
    );

    await insertMany(
      db,
      `INSERT OR REPLACE INTO prod_summary (
        game_id, player, prod_group, prod_name, count
      ) VALUES (?, ?, ?, ?, ?)`,
      snapshot.prodSummaryRows,
    );

    await dbRun(db, "COMMIT");
  } catch (err) {
    await dbRun(db, "ROLLBACK");
    throw err;
  }
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
      "node parse_replays_to_sqlite.js [--replays replays] [--db data/replay_analysis.db] [--id-map data/wc3_ids.csv] [--concurrency N] [--flush-size N] [--min-duration-ms 180000]",
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    usage();
    return;
  }

  const replaysDir = args.replays || path.join(__dirname, "replays");
  const dbPath = args.db || path.join(__dirname, "data", "replay_analysis.db");
  const idMapPath = args["id-map"] || path.join(__dirname, "data", "wc3_ids.csv");
  const cpuCount =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : os.cpus().length;
  const concurrency = toInt(args.concurrency, Math.max(2, cpuCount - 1));
  const flushSize = toInt(args["flush-size"], 5000);
  const minDurationMs = toInt(args["min-duration-ms"], 180000);

  await fsp.mkdir(path.dirname(dbPath), { recursive: true });

  const lookup = await loadIdLookup(idMapPath);
  console.log(`Loaded ${lookup.size} ID mappings from ${idMapPath}`);

  const replayFiles = await collectReplayFiles(replaysDir);
  if (replayFiles.length === 0) {
    console.log(`No replay files found in ${replaysDir}`);
    return;
  }

  console.log(`Found ${replayFiles.length} replay files`);
  console.log(
    `Parsing with concurrency=${concurrency}, flush-size=${flushSize}, min-duration-ms=${minDurationMs}`,
  );

  const db = await openDb(dbPath);
  db.configure("busyTimeout", 10000);
  await initializeSchema(db);

  let buffers = createEmptyBuffers();
  let flushChain = Promise.resolve();
  const failures = [];
  const stats = {
    parsed: 0,
    skipped: 0,
    failed: 0,
  };

  const scheduleFlush = (force = false) => {
    if (!force && totalBuffered(buffers) < flushSize) {
      return flushChain;
    }
    flushChain = flushChain.then(async () => {
      if (!force && totalBuffered(buffers) < flushSize) {
        return;
      }
      const snapshot = buffers;
      buffers = createEmptyBuffers();
      await flushSnapshot(db, snapshot);
    });
    return flushChain;
  };

  const addRowsAndMaybeFlush = async (rows) => {
    buffers.gameRows.push(...rows.gameRows);
    buffers.actionRows.push(...rows.actionRows);
    buffers.prodOrderRows.push(...rows.prodOrderRows);
    buffers.prodSummaryRows.push(...rows.prodSummaryRows);
    if (totalBuffered(buffers) >= flushSize) {
      await scheduleFlush(false);
    }
  };

  const startedAt = Date.now();
  await runPool(replayFiles, concurrency, async (filePath, idx) => {
    try {
      const parser = new W3GReplay();
      const result = await parser.parse(filePath);
      const extracted = extractRows(
        result,
        path.basename(filePath),
        lookup,
        minDurationMs,
      );
      if (!extracted) {
        stats.skipped += 1;
      } else {
        await addRowsAndMaybeFlush(extracted);
        stats.parsed += 1;
      }
    } catch (err) {
      stats.failed += 1;
      failures.push(`${filePath}\t${err.message}`);
    }

    const done = idx + 1;
    if (done % 100 === 0 || done === replayFiles.length) {
      console.log(
        `Progress ${done}/${replayFiles.length} | parsed=${stats.parsed} skipped=${stats.skipped} failed=${stats.failed}`,
      );
    }
  });

  await scheduleFlush(true);
  await flushChain;
  await closeDb(db);

  if (failures.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const failurePath = path.join(
      __dirname,
      "data",
      `parse_failures_${stamp}.log`,
    );
    await fsp.writeFile(failurePath, `${failures.join("\n")}\n`, "utf8");
    console.log(`Failure log: ${failurePath}`);
  }

  const durationSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `Completed in ${durationSec}s | files=${replayFiles.length} parsed=${stats.parsed} skipped=${stats.skipped} failed=${stats.failed}`,
  );
  console.log(`Output DB: ${dbPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

