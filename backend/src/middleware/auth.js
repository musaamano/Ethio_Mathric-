/**
 * Authentication & Authorization Middleware
 * PostgreSQL version
 */
const { verifyAccess } = require('../config/jwt');
const { pool }         = require('../config/db');
const R                = require('../utils/apiResponse');

// Simple in-memory LRU cache to reduce DB hits on every authenticated request
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Verify JWT access token from Authorization header or ?token= query param
 * (query param needed for SSE/EventSource which cannot set custom headers)
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return R.unauthorized(res, 'No token provided');
    }

    let decoded;
    try {
      decoded = verifyAccess(token);
    } catch (verifyErr) {
      if (verifyErr.name === 'TokenExpiredError') return R.unauthorized(res, 'Token expired');
      if (verifyErr.name === 'JsonWebTokenError')  return R.unauthorized(res, 'Invalid token');
      throw verifyErr;
    }

    // Check cache first
    const now      = Date.now();
    const userData = userCache.get(decoded.id);

    if (userData && (now - userData.cachedAt < CACHE_TTL_MS)) {
      req.user = userData.user;
      return next();
    }

    // Cache miss — verify user still exists and is active
    let rows;
    try {
      const result = await pool.query(
        'SELECT id, role_id, email, first_name, last_name, is_active FROM users WHERE id = $1',
        [decoded.id]
      );
      rows = result.rows;
    } catch (dbErr) {
      console.error('[Auth] Database error:', dbErr.message);
      return R.unauthorized(res, 'Authentication service error');
    }

    if (!rows || !rows.length || !rows[0].is_active) {
      return R.unauthorized(res, 'Account not found or deactivated');
    }

    userCache.set(decoded.id, { user: rows[0], cachedAt: now });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return R.unauthorized(res, 'Token expired');
    if (err.name === 'JsonWebTokenError')  return R.unauthorized(res, 'Invalid token');
    console.error('[Auth] Unexpected error:', err);
    next(err);
  }
};

/**
 * Role-based authorization
 * @param  {...string} roles - e.g. 'student', 'admin', 'super_admin'
 */
const authorize = (...roles) => async (req, res, next) => {
  try {
    const roleMap = { 1: 'student', 2: 'admin', 3: 'super_admin' };
    const userRole = roleMap[req.user.role_id];

    if (!userRole || !roles.includes(userRole)) {
      return R.forbidden(res, 'You do not have permission to perform this action');
    }

    req.userRole = userRole;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Check for an active subscription — sets req.hasSubscription
 */
const requireSubscription = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       LIMIT 1`,
      [req.user.id]
    );
    req.hasSubscription = rows.length > 0;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, requireSubscription };
