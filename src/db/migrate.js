"use strict";

require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { createPool, closePool } = require("./pool");

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(client) {
  const { rows } = await client.query("SELECT id FROM schema_migrations ORDER BY id");
  return rows.map((row) => row.id);
}

async function listUpMigrations() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((file) => /^\d+_.*\.sql$/.test(file) && !file.endsWith(".down.sql")).sort();
}

async function migrateUp(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations");
  const pool = createPool(databaseUrl);
  let client;
  try {
    client = await pool.connect();
    await ensureMigrationsTable(client);
    const applied = new Set(await appliedMigrations(client));
    const files = await listUpMigrations();
    const ran = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return ran;
  } finally {
    client?.release();
    await closePool(pool);
  }
}

async function migrateDown(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required to roll back migrations");
  const pool = createPool(databaseUrl);
  let client;
  try {
    client = await pool.connect();
    await ensureMigrationsTable(client);
    const applied = await appliedMigrations(client);
    const latest = applied.at(-1);
    if (!latest) return [];
    const downFile = latest.replace(/\.sql$/, ".down.sql");
    const downPath = path.join(MIGRATIONS_DIR, downFile);
    const sql = await fs.readFile(downPath, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("DELETE FROM schema_migrations WHERE id = $1", [latest]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    return [latest];
  } finally {
    client?.release();
    await closePool(pool);
  }
}

async function main() {
  const direction = process.argv[2] || "up";
  const ran = direction === "down" ? await migrateDown() : await migrateUp();
  process.stdout.write(`${direction} ${ran.length ? ran.join(", ") : "(nothing to do)"}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { migrateUp, migrateDown };
