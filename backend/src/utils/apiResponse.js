/**
 * Standardised API response helpers
 */

const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data = {}, message = 'Created') =>
  success(res, data, message, 201);

const error = (res, message = 'An error occurred', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401);

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403);

const badRequest = (res, message = 'Bad request', errors = null) =>
  error(res, message, 400, errors);

const paginated = (res, data, total, page, limit, message = 'Success') =>
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest, paginated };
