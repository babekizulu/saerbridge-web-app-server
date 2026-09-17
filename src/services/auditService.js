"use strict";

const { hashIp, coarseUserAgent } = require("../utils/crypto");

function createAuditService({ pool, config }) {
  async function record(req, eventType, metadata = {}) {
    const userId = req.currentUser?.id || req.session?.userId || null;
    const ipHash = hashIp(req.ip, config.sessionSecret);
    const userAgent = coarseUserAgent(req.headers["user-agent"]);
    await pool.query(
      `INSERT INTO security_audit_events (user_id, event_type, ip_hash, user_agent, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [userId, eventType, ipHash, userAgent, req.requestId || null, JSON.stringify(metadata)]
    );
  }

  return { record };
}

module.exports = { createAuditService };
