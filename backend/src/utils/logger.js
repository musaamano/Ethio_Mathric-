/**
 * Winston Logger
 */
const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const redactMetadata = (value) => {
  if (Array.isArray(value)) return value.map(redactMetadata);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      /secret|token|password|authorization|api[-_]?key/i.test(key)
        ? '[REDACTED]'
        : redactMetadata(entry),
    ]));
  }
  return value;
};

const serializeMetadata = (metadata) => {
  try {
    return JSON.stringify(redactMetadata(metadata));
  } catch {
    return '[Unserializable metadata]';
  }
};

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const extra = Object.keys(metadata).length > 0
    ? ` ${serializeMetadata(metadata)}`
    : '';
  return `${timestamp} [${level}]: ${stack || message}${extra}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
    }),
  ],
});

module.exports = logger;
