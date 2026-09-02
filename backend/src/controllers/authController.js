/**
 * Auth Controller
 * Handles: register, login, logout, refresh, forgot/reset password
 * PostgreSQL version
 */
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const { pool } = require('../config/db');
const { signAccess, signRefresh, verifyRefresh } = require('../config/jwt');
const R        = require('../utils/apiResponse');
const logger   = require('../utils/logger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone, stream, school, region } = req.body;

    // Check duplicate email
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (existing.length) {
      return R.badRequest(res, 'An account with this email already exists');
    }

    const password_hash  = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verify_token   = uuidv4();
    const verify_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const { rows: result } = await pool.query(
      `INSERT INTO users
         (first_name, last_name, email, phone, password_hash, stream, school, region,
          email_verify_token, email_verify_expires, role_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)
       RETURNING id`,
      [first_name, last_name, email, phone || null, password_hash,
       stream || null, school || null, region || null,
       verify_token, verify_expires]
    );

    // Send verification email (non-blocking)
    sendVerificationEmail(email, first_name, verify_token).catch(err =>
      logger.warn(`[Auth] Verification email failed for ${email}: ${err.message}`)
    );
    logger.info(`New student registered: ${email}`);

    return R.created(res,
      { id: result[0].id, email },
      'Registration successful. Please check your email to verify your account.'
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, device_id, remember_me } = req.body;

    const { rows: users } = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email]
    );

    if (!users.length) {
      return R.unauthorized(res, 'Invalid email or password');
    }

    const user = users[0];

    if (!user.is_active) {
      return R.unauthorized(res, 'Your account has been deactivated. Please contact support.');
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox.',
        code:    'EMAIL_NOT_VERIFIED',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return R.unauthorized(res, 'Invalid email or password');
    }

    // Parse device info from User-Agent
    const ua      = new UAParser(req.headers['user-agent']);
    const browser = `${ua.getBrowser().name || 'Unknown'} ${ua.getBrowser().version || ''}`.trim();
    const os      = `${ua.getOS().name || 'Unknown'} ${ua.getOS().version || ''}`.trim();
    const ip      = req.ip || req.connection?.remoteAddress;

    // One active session per account — invalidate previous sessions
    await pool.query(
      'UPDATE sessions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [user.id]
    );

    // Generate tokens
    const payload       = { id: user.id, role: user.role_name, email: user.email };
    const accessToken   = signAccess(payload);
    const refreshToken  = signRefresh(payload);
    const refreshExpiry = remember_me
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() +  7 * 24 * 60 * 60 * 1000); // 7 days

    // Save session
    const finalDeviceId = device_id || uuidv4();
    await pool.query(
      `INSERT INTO sessions
         (user_id, refresh_token, device_id, browser, os, ip_address, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.id, refreshToken, finalDeviceId, browser, os, ip, refreshExpiry]
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires:  refreshExpiry,
    });

    return R.success(res, {
      accessToken,
      user: {
        id:         user.id,
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        role:       user.role_name,
        avatar_url: user.avatar_url,
        stream:     user.stream,
        device_id:  finalDeviceId,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return R.unauthorized(res, 'No refresh token');

    const decoded = verifyRefresh(token);

    const { rows: sessions } = await pool.query(
      `SELECT s.*, u.is_active, r.name AS role_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE s.refresh_token = $1
         AND s.is_active = TRUE
         AND s.expires_at > NOW()`,
      [token]
    );

    if (!sessions.length) {
      return R.unauthorized(res, 'Session expired or revoked. Please log in again.');
    }

    const session = sessions[0];
    if (!session.is_active) {
      return R.unauthorized(res, 'Account deactivated');
    }

    const payload         = { id: decoded.id, role: session.role_name, email: decoded.email };
    const newAccess       = signAccess(payload);
    const newRefreshToken = signRefresh(payload);

    await pool.query(
      'UPDATE sessions SET refresh_token = $1 WHERE refresh_token = $2',
      [newRefreshToken, token]
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires:  new Date(session.expires_at),
    });

    return R.success(res, { accessToken: newAccess }, 'Token refreshed');
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return R.unauthorized(res, 'Invalid or expired refresh token. Please log in again.');
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (token) {
      await pool.query(
        'UPDATE sessions SET is_active = FALSE WHERE refresh_token = $1',
        [token]
      );
    }

    res.clearCookie('refreshToken');
    return R.success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { rows: users } = await pool.query(
      'SELECT id, first_name FROM users WHERE email = $1', [email]
    );

    // Always respond the same way to prevent email enumeration
    if (!users.length) {
      return R.success(res, {}, 'If your email is registered, you will receive a reset link.');
    }

    const user        = users[0];
    const resetToken  = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpiry, user.id]
    );

    sendPasswordResetEmail(email, user.first_name, resetToken).catch(err =>
      logger.warn(`[Auth] Reset email failed for ${email}: ${err.message}`)
    );
    logger.info(`Password reset requested for: ${email}`);

    return R.success(res, {}, 'If your email is registered, you will receive a reset link.');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const { rows: users } = await pool.query(
      `SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()`,
      [token]
    );

    if (!users.length) {
      return R.badRequest(res, 'Reset link is invalid or has expired');
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
      [hash, users[0].id]
    );

    // Invalidate all sessions
    await pool.query(
      'UPDATE sessions SET is_active = FALSE WHERE user_id = $1',
      [users[0].id]
    );

    return R.success(res, {}, 'Password reset successful. Please log in.');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const { rows: users } = await pool.query(
      `SELECT id FROM users
       WHERE email_verify_token = $1
         AND email_verify_expires > NOW()
         AND is_email_verified = FALSE`,
      [token]
    );

    if (!users.length) {
      return R.badRequest(res, 'Verification link is invalid or has expired');
    }

    await pool.query(
      `UPDATE users
       SET is_email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL
       WHERE id = $1`,
      [users[0].id]
    );

    return R.success(res, {}, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET ACTIVE SESSIONS
// ─────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, device_id, browser, os, ip_address, location, created_at, expires_at
       FROM sessions
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return R.success(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// RESEND VERIFICATION EMAIL
// ─────────────────────────────────────────────
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { rows: users } = await pool.query(
      'SELECT id, first_name, is_email_verified FROM users WHERE email = $1',
      [email]
    );

    if (!users.length) {
      return R.success(res, {}, 'If your email is registered and unverified, a new link has been sent.');
    }

    const user = users[0];
    if (user.is_email_verified) {
      return R.success(res, {}, 'Your email is already verified. Please log in.');
    }

    const verifyToken   = uuidv4();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3',
      [verifyToken, verifyExpires, user.id]
    );

    sendVerificationEmail(email, user.first_name, verifyToken).catch(err =>
      logger.warn(`[Auth] Resend verification email failed for ${email}: ${err.message}`)
    );
    logger.info(`Verification email resent for: ${email}`);

    return R.success(res, {}, 'If your email is registered and unverified, a new link has been sent.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, login, logout, refreshToken,
  forgotPassword, resetPassword, verifyEmail,
  getSessions, resendVerification,
};
