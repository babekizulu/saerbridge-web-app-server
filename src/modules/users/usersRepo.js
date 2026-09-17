"use strict";

const LOCALES = ["en-ZA", "ar", "zh-CN", "ja", "ko", "sa", "ru", "el", "he", "gez"];

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    primaryEmail: row.primary_email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    accountStatus: row.account_status,
    locale: row.locale || null,
    reduceMotion: row.reduce_motion ?? null,
    theme: row.theme || null,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function createUsersRepo(pool) {
  async function findById(id) {
    const { rows } = await pool.query(
      `SELECT u.*, p.locale, p.reduce_motion, p.theme
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async function findByGoogleSub(googleSub) {
    const { rows } = await pool.query(
      `SELECT u.*, p.locale, p.reduce_motion, p.theme
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
       WHERE u.google_sub = $1 AND u.deleted_at IS NULL`,
      [googleSub]
    );
    return rows[0] || null;
  }

  async function createFromGoogle({ googleSub, email, displayName, avatarUrl, role, locale }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO users (google_sub, primary_email, display_name, avatar_url, role, last_login_at)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING *`,
        [googleSub, email, displayName, avatarUrl, role]
      );
      const user = rows[0];
      await client.query(
        `INSERT INTO user_preferences (user_id, locale) VALUES ($1, $2)`,
        [user.id, locale || "en-ZA"]
      );
      await client.query("COMMIT");
      return findById(user.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function touchLogin(id, { email, displayName, avatarUrl, role }) {
    await pool.query(
      `UPDATE users
       SET last_login_at = now(),
           primary_email = COALESCE($2, primary_email),
           display_name = CASE WHEN display_name = 'Deleted account' THEN display_name ELSE COALESCE($3, display_name) END,
           avatar_url = COALESCE($4, avatar_url),
           role = $5,
           updated_at = now()
       WHERE id = $1`,
      [id, email, displayName, avatarUrl, role]
    );
    return findById(id);
  }

  async function updateProfile(id, { displayName }) {
    const { rows } = await pool.query(
      `UPDATE users
       SET display_name = $2, updated_at = now()
       WHERE id = $1 AND account_status = 'active'
       RETURNING *`,
      [id, displayName]
    );
    return rows[0] ? findById(id) : null;
  }

  async function completeOnboarding(id, { locale }) {
    await pool.query(
      `UPDATE users SET onboarding_completed_at = now(), updated_at = now()
       WHERE id = $1 AND onboarding_completed_at IS NULL`,
      [id]
    );
    if (locale) {
      await pool.query(
        `UPDATE user_preferences SET locale = $2, updated_at = now() WHERE user_id = $1`,
        [id, locale]
      );
    }
    return findById(id);
  }

  async function getPreferences(userId) {
    const { rows } = await pool.query(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId]);
    return rows[0] || null;
  }

  async function upsertPreferences(userId, { locale, reduceMotion, theme }) {
    const { rows } = await pool.query(
      `INSERT INTO user_preferences (user_id, locale, reduce_motion, theme)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         locale = EXCLUDED.locale,
         reduce_motion = EXCLUDED.reduce_motion,
         theme = EXCLUDED.theme,
         updated_at = now()
       RETURNING *`,
      [userId, locale, reduceMotion, theme]
    );
    return rows[0];
  }

  async function recordAcceptance(userId, { documentType, documentVersion, acceptanceKind }) {
    await pool.query(
      `INSERT INTO legal_acceptances (user_id, document_type, document_version, acceptance_kind)
       VALUES ($1, $2, $3, $4)`,
      [userId, documentType, documentVersion, acceptanceKind]
    );
  }

  async function listAcceptances(userId) {
    const { rows } = await pool.query(
      `SELECT document_type, document_version, acceptance_kind, accepted_at
       FROM legal_acceptances
       WHERE user_id = $1
       ORDER BY accepted_at DESC`,
      [userId]
    );
    return rows;
  }

  async function exportAccount(userId) {
    const user = await findById(userId);
    const preferences = await getPreferences(userId);
    const acceptances = await listAcceptances(userId);
    const { rows: requests } = await pool.query(
      `SELECT id, request_type, request_status, requested_at, completed_at
       FROM data_rights_requests WHERE user_id = $1 ORDER BY requested_at DESC`,
      [userId]
    );
    return {
      exportedAt: new Date().toISOString(),
      user: publicUser(user),
      preferences: preferences
        ? {
            locale: preferences.locale,
            reduceMotion: preferences.reduce_motion,
            theme: preferences.theme,
            updatedAt: preferences.updated_at,
          }
        : null,
      legalAcceptances: acceptances,
      dataRightsRequests: requests,
    };
  }

  async function deleteAccount(userId) {
    const marker = `deleted:${userId}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE users
         SET google_sub = $2,
             primary_email = $3,
             display_name = 'Deleted account',
             avatar_url = NULL,
             role = 'member',
             account_status = 'deleted',
             deleted_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [userId, marker, `deleted-${userId}@invalid.invalid`]
      );
      await client.query(`DELETE FROM user_preferences WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM sessions WHERE sess->>'userId' = $1`, [userId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    findById,
    findByGoogleSub,
    createFromGoogle,
    touchLogin,
    updateProfile,
    completeOnboarding,
    getPreferences,
    upsertPreferences,
    recordAcceptance,
    listAcceptances,
    exportAccount,
    deleteAccount,
  };
}

module.exports = { createUsersRepo, publicUser, LOCALES };
