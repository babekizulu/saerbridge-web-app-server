"use strict";

require("dotenv").config();

const { loadEnv } = require("./config/env");
const { createPool, closePool } = require("./db/pool");
const { createLogger } = require("./utils/logger");

async function runMaintenance(databaseUrl) {
  const config = databaseUrl ? { ...loadEnv(), databaseUrl } : loadEnv();
  const logger = createLogger(config.logLevel === "silent" ? "error" : config.logLevel);
  const pool = createPool(config.databaseUrl || databaseUrl);

  try {
    const sessions = await pool.query(`DELETE FROM sessions WHERE expire < now()`);
    const audit = await pool.query(
      `DELETE FROM security_audit_events
       WHERE created_at < now() - ($1::int * interval '1 day')`,
      [config.retention.securityAuditDays]
    );
    const rights = await pool.query(
      `DELETE FROM data_rights_requests
       WHERE request_status = 'completed'
         AND completed_at IS NOT NULL
         AND completed_at < now() - ($1::int * interval '1 day')`,
      [config.retention.completedDataRightsDays]
    );

    const summary = {
      expiredSessions: sessions.rowCount,
      expiredAuditEvents: audit.rowCount,
      expiredCompletedDataRights: rights.rowCount,
    };
    logger.info(summary, "saerbridge.maintenance.complete");
    return summary;
  } finally {
    await closePool(pool);
  }
}

if (require.main === module) {
  runMaintenance().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { runMaintenance };
