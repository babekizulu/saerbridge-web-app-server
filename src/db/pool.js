"use strict";

const { Pool } = require("pg");

function createPool(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error.code || error.message);
  });
  return pool;
}

async function closePool(pool) {
  if (pool) {
    await pool.end();
  }
}

module.exports = { createPool, closePool };
