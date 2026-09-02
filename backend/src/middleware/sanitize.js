/**
 * sanitize.js
 * Input sanitization middleware.
 * Strips HTML tags and trims strings from req.body, req.query, req.params.
 * Protects against stored XSS attacks.
 */

function sanitizeValue(val) {
  if (typeof val === 'string') {
    // Remove HTML tags
    return val
      .replace(/<[^>]*>/g, '')  // strip HTML tags
      .replace(/javascript:/gi, '') // remove js: protocol
      .replace(/on\w+\s*=/gi, '')   // remove inline event handlers
      .trim();
  }
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return sanitizeObject(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  return val;
}

function sanitizeObject(obj) {
  const clean = {};
  for (const key of Object.keys(obj)) {
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
}

const sanitize = (req, res, next) => {
  if (req.body)   req.body   = sanitizeObject(req.body);
  if (req.query)  req.query  = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = sanitize;
