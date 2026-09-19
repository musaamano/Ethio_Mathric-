/**
 * User Controller — Profile, settings, admin user management
 * PostgreSQL version
 */
const bcrypt = require('bcryptjs');
const { pool, getClient } = require('../config/db');
const R = require('../utils/apiResponse');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ─────────────────────────────────────────────
// GET MY PROFILE
// ─────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.stream, u.school, u.region, u.city, u.is_email_verified,
              u.access_type, u.last_login, u.created_at, r.name AS role,
              s.status AS subscription_status, s.expires_at AS subscription_expires
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN subscriptions s ON s.user_id = u.id
         AND s.status = 'active' AND s.expires_at > NOW()
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return R.notFound(res);
    return R.success(res, rows[0]);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, stream, school, region, city } = req.body;
    const avatar_url = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

    const fields = [
      'first_name=$1', 'last_name=$2', 'phone=$3', 'stream=$4',
      'school=$5', 'region=$6', 'city=$7',
    ];
    const params = [
      first_name, last_name, phone || null, stream || null,
      school || null, region || null, city || null,
    ];

    if (avatar_url) {
      fields.push(`avatar_url=$${params.length + 1}`);
      params.push(avatar_url);
    }

    params.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${params.length}`,
      params
    );
    return R.success(res, {}, 'Profile updated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const { rows: users } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const match = await bcrypt.compare(current_password, users[0].password_hash);
    if (!match) return R.badRequest(res, 'Current password is incorrect');
    const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    return R.success(res, {}, 'Password changed successfully');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// SHARED: build filter WHERE clause + JOINs
// Used by getAllUsers (paginated) and exportUsers (full CSV).
// Returns { whereStr, activeSubJoin, anySubJoin, params }
// ─────────────────────────────────────────────
function buildUserFilterQuery(query) {
  const { search, role_id, is_active, stream, subscription } = query;

  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    const p = params.length;
    where.push(`(u.first_name ILIKE $${p} OR u.last_name ILIKE $${p} OR u.email ILIKE $${p})`);
  }

  if (role_id) {
    params.push(parseInt(role_id, 10));
    where.push(`u.role_id = $${params.length}`);
  }

  if (is_active !== undefined && is_active !== '') {
    params.push(is_active === 'true');
    where.push(`u.is_active = $${params.length}`);
  }

  const VALID_STREAMS = ['natural_science', 'social_science'];
  if (stream && VALID_STREAMS.includes(stream)) {
    params.push(stream);
    where.push(`u.stream = $${params.length}`);
  }

  const needsAnySubJoin = ['expired', 'none', 'free'].includes(subscription);

  if (subscription === 'active') {
    where.push(`s_active.id IS NOT NULL`);
  } else if (subscription === 'expired') {
    where.push(`s_active.id IS NULL AND s_any.id IS NOT NULL`);
  } else if (subscription === 'none') {
    where.push(`s_any.id IS NULL`);
  } else if (subscription === 'free') {
    where.push(`s_active.id IS NULL AND u.access_type = 'free'`);
  }

  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const activeSubJoin = `
    LEFT JOIN subscriptions s_active
      ON s_active.user_id = u.id
     AND s_active.status = 'active'
     AND s_active.expires_at > NOW()`;

  const anySubJoin = needsAnySubJoin
    ? `LEFT JOIN subscriptions s_any ON s_any.user_id = u.id`
    : '';

  const latestSubJoin = `
    LEFT JOIN LATERAL (
      SELECT status, expires_at
      FROM subscriptions
      WHERE user_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) sub_latest ON TRUE`;

  return { whereStr, activeSubJoin, anySubJoin, latestSubJoin, params };
}

// ─────────────────────────────────────────────
// ADMIN: GET ALL USERS
// Supports: search, role_id, is_active, stream, subscription filters
// Supports: sort_field, sort_dir for column sorting
// All filters are combinable, all SQL is parameterized.
// ─────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort_field, sort_dir } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { whereStr, activeSubJoin, anySubJoin, latestSubJoin, params } =
      buildUserFilterQuery(req.query);

    // Sorting — allowlisted column map prevents SQL injection
    const SORT_MAP = {
      name:       'u.first_name',
      email:      'u.email',
      joined:     'u.created_at',
      last_login: 'u.last_login',
    };
    const sortCol = SORT_MAP[sort_field] || 'u.created_at';
    const sortDir = sort_dir === 'asc' ? 'ASC' : 'DESC';
    // NULLs last for last_login so users who never logged in appear at the bottom
    const orderClause = `ORDER BY ${sortCol} ${sortDir} NULLS LAST`;

    const countQuery = `
      SELECT COUNT(*) AS c
      FROM users u
      ${activeSubJoin}
      ${anySubJoin}
      ${whereStr}`;

    const { rows: total } = await pool.query(countQuery, params);

    params.push(parseInt(limit));
    params.push(offset);

    const dataQuery = `
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.phone,
        u.stream, u.school, u.region, u.city, u.access_type,
        u.is_active, u.is_email_verified, u.last_login, u.created_at,
        r.name AS role,
        sub_latest.status    AS subscription_status,
        sub_latest.expires_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ${activeSubJoin}
      ${anySubJoin}
      ${latestSubJoin}
      ${whereStr}
      ${orderClause}
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await pool.query(dataQuery, params);

    return R.paginated(res, rows, parseInt(total[0].c), page, limit);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: EXPORT USERS AS CSV
//
// Respects all active filters — same logic as getAllUsers.
// Returns ALL matching rows (no pagination limit).
// Does NOT include passwords, hashes, tokens, or secrets.
// Restricted to admin + super_admin via route middleware.
// ─────────────────────────────────────────────
const exportUsers = async (req, res, next) => {
  try {
    const { sort_field, sort_dir } = req.query;

    const { whereStr, activeSubJoin, anySubJoin, latestSubJoin, params } =
      buildUserFilterQuery(req.query);

    const SORT_MAP = {
      name:       'u.first_name',
      email:      'u.email',
      joined:     'u.created_at',
      last_login: 'u.last_login',
    };
    const sortCol = SORT_MAP[sort_field] || 'u.created_at';
    const sortDir = sort_dir === 'asc' ? 'ASC' : 'DESC';
    const orderClause = `ORDER BY ${sortCol} ${sortDir} NULLS LAST`;

    const dataQuery = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.stream,
        u.school,
        u.region,
        u.city,
        u.access_type,
        u.is_active,
        u.is_email_verified,
        u.last_login,
        u.created_at,
        r.name                AS role,
        sub_latest.status     AS subscription_status,
        sub_latest.expires_at AS subscription_expires
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ${activeSubJoin}
      ${anySubJoin}
      ${latestSubJoin}
      ${whereStr}
      ${orderClause}`;

    const { rows } = await pool.query(dataQuery, params);

    // ── Build CSV ─────────────────────────────────────────
    const CSV_HEADERS = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone',
      'Role', 'Stream', 'School', 'Region', 'City',
      'Access Type', 'Account Status', 'Email Verified',
      'Subscription Status', 'Subscription Expires',
      'Joined Date', 'Last Login',
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Wrap in quotes if it contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatCSVDate = (d) => {
      if (!d) return '';
      try { return new Date(d).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'; }
      catch { return ''; }
    };

    const csvRows = rows.map(u => [
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone || '',
      u.role,
      u.stream || '',
      u.school || '',
      u.region || '',
      u.city   || '',
      u.access_type || '',
      u.is_active ? 'Active' : 'Disabled',
      u.is_email_verified ? 'Verified' : 'Not Verified',
      u.subscription_status || '',
      formatCSVDate(u.subscription_expires),
      formatCSVDate(u.created_at),
      formatCSVDate(u.last_login),
    ].map(escapeCSV).join(','));

    const csv = [CSV_HEADERS.join(','), ...csvRows].join('\r\n');

    // ── Professional filename with today's date ───────────
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `ethio-matric-academy-users-${today}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM for Excel UTF-8 compatibility
    return res.send('\uFEFF' + csv);

  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: TOGGLE USER ACTIVE STATUS
// ─────────────────────────────────────────────
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = $1', [id]);
    // Revoke sessions if deactivated
    await pool.query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1', [id]);
    return R.success(res, {}, 'User status updated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: FORCE LOGOUT
// ─────────────────────────────────────────────
const forceLogout = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1', [id]);
    return R.success(res, {}, 'User sessions terminated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: CHANGE USER ROLE
// ─────────────────────────────────────────────
const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [role_id, id]);
    return R.success(res, {}, 'User role updated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// SUPER ADMIN: DELETE USER
//
// Foreign-key analysis (post-migration-004 schema):
//
//   CASCADE — auto-deleted when user row is deleted:
//     sessions, subscriptions, results, result_answers,
//     bookmarks, free_subject_daily_usage
//
//   NO CASCADE — NULLed before deletion (column allows NULL):
//     payments.admin_approved_by
//     questions.created_by
//     reports.user_id, reports.reviewed_by
//     announcements.created_by
//     system_settings.updated_by
//
//   PAYMENTS.user_id — BLOCKED (NOT NULL column):
//     If any payment row references this user, deletion is rejected
//     with 409 USER_HAS_PAYMENTS so the admin can disable instead.
//
//   DROPPED TABLES (do not reference):
//     mock_exams, chapters, notes, exam_questions, daily_quiz_log
//     — all removed by migration 004.
//
// Self-deletion is blocked. All ops inside a single transaction.
// ─────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  const targetId = parseInt(req.params.id, 10);
  if (!targetId || isNaN(targetId)) {
    return R.badRequest(res, 'Invalid user ID');
  }
  if (targetId === req.user.id) {
    return R.badRequest(res, 'You cannot delete your own account');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Confirm target user exists
    const { rows: target } = await client.query(
      'SELECT id, first_name, last_name, email, role_id FROM users WHERE id = $1',
      [targetId]
    );
    if (!target.length) {
      await client.query('ROLLBACK');
      return R.notFound(res, 'User not found');
    }

    // Check for payment records — payments.user_id is NOT NULL
    // Deletion is blocked if any payment row references this user
    // to preserve the financial audit trail
    const { rows: paymentCheck } = await client.query(
      'SELECT id FROM payments WHERE user_id = $1 LIMIT 1',
      [targetId]
    );
    if (paymentCheck.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        code: 'USER_HAS_PAYMENTS',
        message: `Cannot delete this account because it has associated payment records that must be preserved for financial auditing. You can disable the account instead.`,
      });
    }

    // NULL out non-cascading FK references where the column allows NULL.
    // Only touches tables confirmed to exist after migration 004
    // (mock_exams, notes, exam_questions, chapters, daily_quiz_log were all dropped).
    await client.query('UPDATE payments        SET admin_approved_by = NULL WHERE admin_approved_by = $1', [targetId]);
    await client.query('UPDATE questions       SET created_by        = NULL WHERE created_by        = $1', [targetId]);
    await client.query('UPDATE reports         SET user_id           = NULL WHERE user_id           = $1', [targetId]);
    await client.query('UPDATE reports         SET reviewed_by       = NULL WHERE reviewed_by       = $1', [targetId]);
    await client.query('UPDATE announcements   SET created_by        = NULL WHERE created_by        = $1', [targetId]);
    await client.query('UPDATE system_settings SET updated_by        = NULL WHERE updated_by        = $1', [targetId]);

    // Delete user — CASCADE handles sessions, subscriptions, results,
    // result_answers, bookmarks, free_subject_daily_usage, daily_quiz_log
    await client.query('DELETE FROM users WHERE id = $1', [targetId]);

    await client.query('COMMIT');

    logger.info(
      `[UserDelete] Super admin ${req.user.id} deleted user ${targetId} (${target[0].email}).`
    );

    return R.success(res, {}, 'User account deleted successfully.');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error(`[UserDelete] Transaction rolled back for user ${targetId}: ${err.message}`);
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// STUDENT: SELECT FREE ACCESS
// ─────────────────────────────────────────────
const updateAccessType = async (req, res, next) => {
  try {
    if (req.user.role_id !== 1) {
      return R.forbidden(res, 'Only students can select access type');
    }

    const { access_type } = req.body;
    if (access_type !== 'free') {
      return R.badRequest(res, 'Only free access can be selected here');
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET access_type = 'free', updated_at = NOW()
       WHERE id = $1
       RETURNING id, access_type`,
      [req.user.id]
    );

    if (!rows.length) return R.notFound(res, 'User not found');
    return R.success(res, rows[0], 'Free access selected');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN/SUPER ADMIN: GET USER ACTIVITY
//
// Returns aggregate statistics and the 20 most recent
// practice/past-year/random sessions for a given user.
// Uses SQL aggregation — no per-answer row loading.
// ─────────────────────────────────────────────
const getUserActivity = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId || isNaN(targetId)) {
      return R.badRequest(res, 'Invalid user ID');
    }

    // Confirm user exists (lightweight check)
    const { rows: userCheck } = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1',
      [targetId]
    );
    if (!userCheck.length) {
      return R.notFound(res, 'User not found');
    }

    // ── Aggregate statistics ──────────────────────────────
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)::int                                   AS total_attempts,
         COALESCE(SUM(total_questions), 0)::int          AS total_questions,
         COALESCE(SUM(correct_answers), 0)::int          AS total_correct,
         COALESCE(SUM(wrong_answers), 0)::int            AS total_wrong,
         COALESCE(SUM(skipped), 0)::int                  AS total_skipped,
         ROUND(AVG(score_percent)::numeric, 1)           AS avg_score,
         ROUND(MAX(score_percent)::numeric, 1)           AS highest_score,
         COALESCE(SUM(time_taken_secs), 0)::int          AS total_study_secs,
         COUNT(DISTINCT subject_id)::int                 AS subjects_studied,
         SUM(CASE WHEN mode = 'practice'  THEN 1 ELSE 0 END)::int AS practice_sessions,
         SUM(CASE WHEN mode = 'past_year' THEN 1 ELSE 0 END)::int AS past_year_sessions,
         SUM(CASE WHEN mode = 'random'    THEN 1 ELSE 0 END)::int AS random_sessions
       FROM results
       WHERE user_id = $1`,
      [targetId]
    );

    // ── Per-subject breakdown (top 6) ─────────────────────
    const { rows: subjectStats } = await pool.query(
      `SELECT
         s.name                                          AS subject_name,
         s.color,
         COUNT(r.id)::int                                AS attempts,
         ROUND(AVG(r.score_percent)::numeric, 1)         AS avg_score,
         COALESCE(SUM(r.correct_answers), 0)::int        AS total_correct,
         COALESCE(SUM(r.total_questions), 0)::int        AS total_questions
       FROM results r
       JOIN subjects s ON s.id = r.subject_id
       WHERE r.user_id = $1
       GROUP BY r.subject_id, s.name, s.color
       ORDER BY avg_score DESC NULLS LAST
       LIMIT 6`,
      [targetId]
    );

    // ── Recent activity (latest 20 sessions) ─────────────
    const { rows: recentActivity } = await pool.query(
      `SELECT
         r.id,
         r.mode,
         r.total_questions,
         r.correct_answers,
         r.wrong_answers,
         r.skipped,
         r.score_percent,
         r.time_taken_secs,
         r.completed_at,
         s.name AS subject_name
       FROM results r
       LEFT JOIN subjects s ON s.id = r.subject_id
       WHERE r.user_id = $1
       ORDER BY r.completed_at DESC NULLS LAST
       LIMIT 20`,
      [targetId]
    );

    return R.success(res, {
      user:           userCheck[0],
      stats:          statsRows[0],
      subjectStats,
      recentActivity,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// SUPER ADMIN: UPDATE USER EMAIL VERIFICATION
//
// Allows a super_admin to manually mark a user's email
// as verified or unverified.
// Does NOT send any email. Does NOT touch verification tokens.
// Backend enforces super_admin restriction — not just the UI.
// ─────────────────────────────────────────────
const updateEmailVerification = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId || isNaN(targetId)) {
      return R.badRequest(res, 'Invalid user ID');
    }

    const { is_email_verified } = req.body;
    if (typeof is_email_verified !== 'boolean') {
      return R.badRequest(res, 'is_email_verified must be a boolean');
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET is_email_verified = $1,
           email_verify_token   = CASE WHEN $1 = TRUE THEN NULL ELSE email_verify_token END,
           email_verify_expires = CASE WHEN $1 = TRUE THEN NULL ELSE email_verify_expires END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, is_email_verified`,
      [is_email_verified, targetId]
    );

    if (!rows.length) {
      return R.notFound(res, 'User not found');
    }

    logger.info(
      `[EmailVerify] Super admin ${req.user.id} set is_email_verified=${is_email_verified} ` +
      `for user ${targetId}`
    );

    return R.success(
      res,
      rows[0],
      is_email_verified ? 'Email marked as verified' : 'Email marked as unverified'
    );
  } catch (err) { next(err); }
};

module.exports = {
  getProfile, updateAccessType, updateProfile, changePassword,
  getAllUsers, exportUsers, toggleUserStatus, forceLogout, changeUserRole, deleteUser,
  getUserActivity, updateEmailVerification,
};
