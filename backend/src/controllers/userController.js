/**
 * User Controller — Profile, settings, admin user management
 * PostgreSQL version
 */
const bcrypt   = require('bcryptjs');
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ─────────────────────────────────────────────
// GET MY PROFILE
// ─────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.stream, u.school, u.region, u.city, u.is_email_verified,
              u.last_login, u.created_at, r.name AS role,
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
      'first_name=$1','last_name=$2','phone=$3','stream=$4',
      'school=$5','region=$6','city=$7',
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
// ADMIN: GET ALL USERS
// ─────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { search, role_id, is_active, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where  = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      where.push(`(u.first_name ILIKE $${p} OR u.last_name ILIKE $${p} OR u.email ILIKE $${p})`);
    }
    if (role_id) {
      params.push(role_id);
      where.push(`u.role_id = $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      where.push(`u.is_active = $${params.length}`);
    }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: total } = await pool.query(
      `SELECT COUNT(*) AS c FROM users u ${whereStr}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.stream, u.school,
              u.is_active, u.is_email_verified, u.last_login, u.created_at,
              r.name AS role,
              s.status AS subscription_status, s.expires_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN subscriptions s ON s.user_id = u.id
         AND s.status = 'active' AND s.expires_at > NOW()
       ${whereStr}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return R.paginated(res, rows, parseInt(total[0].c), page, limit);
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

// ADMIN: FORCE LOGOUT
const forceLogout = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1', [id]);
    return R.success(res, {}, 'User sessions terminated');
  } catch (err) { next(err); }
};

// ADMIN: CHANGE USER ROLE
const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [role_id, id]);
    return R.success(res, {}, 'User role updated');
  } catch (err) { next(err); }
};

module.exports = {
  getProfile, updateProfile, changePassword,
  getAllUsers, toggleUserStatus, forceLogout, changeUserRole,
};
