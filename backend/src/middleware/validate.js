/**
 * Express-Validator middleware helper
 * Collects validation errors and returns them as a 400 response
 */
const { validationResult } = require('express-validator');
const R = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return R.badRequest(res, 'Validation failed', errors.array());
  }
  next();
};

module.exports = validate;
