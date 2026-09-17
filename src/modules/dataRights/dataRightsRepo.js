"use strict";

function createDataRightsRepo(pool) {
  async function create(userId, { requestType, metadata }) {
    const { rows } = await pool.query(
      `INSERT INTO data_rights_requests (user_id, request_type, metadata)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, request_type, request_status, requested_at, completed_at, metadata`,
      [userId, requestType, JSON.stringify(metadata || {})]
    );
    return rows[0];
  }

  async function listMine(userId) {
    const { rows } = await pool.query(
      `SELECT id, request_type, request_status, requested_at, completed_at
       FROM data_rights_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );
    return rows;
  }

  async function listAll() {
    const { rows } = await pool.query(
      `SELECT r.id, r.user_id, r.request_type, r.request_status, r.requested_at, r.completed_at, u.primary_email
       FROM data_rights_requests r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.requested_at DESC
       LIMIT 200`
    );
    return rows;
  }

  async function updateStatus(id, { requestStatus }) {
    const { rows } = await pool.query(
      `UPDATE data_rights_requests
       SET request_status = $2,
           completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
       WHERE id = $1
       RETURNING id, request_type, request_status, requested_at, completed_at`,
      [id, requestStatus]
    );
    return rows[0] || null;
  }

  return { create, listMine, listAll, updateStatus };
}

module.exports = { createDataRightsRepo };
