/**
 * JWT Configuration & Helpers
 */
const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Sign an access token
 * @param {Object} payload - { id, role, email }
 */
const signAccess = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

/**
 * Sign a refresh token
 */
const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

/**
 * Verify an access token
 */
const verifyAccess = (token) =>
  jwt.verify(token, ACCESS_SECRET);

/**
 * Verify a refresh token
 */
const verifyRefresh = (token) =>
  jwt.verify(token, REFRESH_SECRET);

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
