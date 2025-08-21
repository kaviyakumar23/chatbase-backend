const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.status = 400;
    error.errors = errors.array();
    return next(error);
  }
  
  next();
};

module.exports = {
  handleValidationErrors
};