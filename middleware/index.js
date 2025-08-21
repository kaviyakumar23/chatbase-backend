const { requireAuth, optionalAuth } = require('./auth');
const { errorHandler, notFound, asyncHandler } = require('./errorHandler');
const { handleValidationErrors } = require('./validation');

module.exports = {
  requireAuth,
  optionalAuth,
  errorHandler,
  notFound,
  asyncHandler,
  handleValidationErrors
};