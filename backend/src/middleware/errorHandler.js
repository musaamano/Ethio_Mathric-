/**
 * Global Error Handler Middleware
 */
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  // PostgreSQL unique violation (e.g. duplicate email)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced resource does not exist',
    });
  }

  // PostgreSQL not-null violation
  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: 'A required field is missing',
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Value does not meet the required constraints',
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
