import { body, param, query, validationResult } from 'express-validator';
import { createErrorResponse } from '../utils/response.js';

// Validation error handler middleware
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(createErrorResponse('Validation failed', errors.array()));
  }
  next();
};

// Agent validation rules
export const validateCreateAgent = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Agent name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent name must be between 1 and 100 characters'),
  body('model')
    .optional()
    .isIn(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'])
    .withMessage('Invalid model specified'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('system_prompt')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('System prompt cannot exceed 2000 characters'),
  handleValidationErrors
];

export const validateUpdateAgent = [
  param('id').isUUID().withMessage('Invalid agent ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Agent name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent name must be between 1 and 100 characters'),
  body('model')
    .optional()
    .isIn(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'])
    .withMessage('Invalid model specified'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('system_prompt')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('System prompt cannot exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published'),
  handleValidationErrors
];

// Source validation rules
export const validateCreateTextSource = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Source name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Source name must be between 1 and 255 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 1, max: 100000 })
    .withMessage('Content must be between 1 and 100,000 characters'),
  handleValidationErrors
];

export const validateCreateWebsiteSource = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('url')
    .isURL()
    .withMessage('Valid URL is required'),
  body('crawl_subpages')
    .optional()
    .isBoolean()
    .withMessage('crawl_subpages must be a boolean'),
  body('max_pages')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('max_pages must be between 1 and 100'),
  handleValidationErrors
];

// Chat validation rules
export const validateSendMessage = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('session_id')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Session ID cannot exceed 255 characters'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  handleValidationErrors
];

export const validatePublicSendMessage = [
  param('publicId')
    .trim()
    .notEmpty()
    .withMessage('Public ID is required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('session_id')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Session ID cannot exceed 255 characters'),
  handleValidationErrors
];

// Lead validation rules
export const validateCapturePublicLead = [
  param('publicId')
    .trim()
    .notEmpty()
    .withMessage('Public ID is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone number cannot exceed 50 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name cannot exceed 255 characters'),
  body('session_id')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Session ID cannot exceed 255 characters'),
  handleValidationErrors
];

// Deploy settings validation rules
export const validateUpdateDeploySettings = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('initial_message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Initial message cannot exceed 500 characters'),
  body('suggested_messages')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 suggested messages allowed'),
  body('suggested_messages.*')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Each suggested message cannot exceed 100 characters'),
  body('message_placeholder')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Message placeholder cannot exceed 100 characters'),
  body('theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either light or dark'),
  body('bubble_color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Bubble color must be a valid hex color'),
  body('bubble_position')
    .optional()
    .isIn(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
    .withMessage('Invalid bubble position'),
  body('display_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters'),
  body('collect_user_info')
    .optional()
    .isBoolean()
    .withMessage('collect_user_info must be a boolean'),
  body('show_sources')
    .optional()
    .isBoolean()
    .withMessage('show_sources must be a boolean'),
  handleValidationErrors
];

// Integration validation rules
export const validateUpdateIntegrations = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('allowed_domains')
    .optional()
    .isArray()
    .withMessage('Allowed domains must be an array'),
  body('allowed_domains.*')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Domain cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Domain cannot exceed 255 characters'),
  body('share_enabled')
    .optional()
    .isBoolean()
    .withMessage('share_enabled must be a boolean'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// UUID parameter validation
export const validateUUIDParam = (paramName) => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

// Date range validation
export const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date must be a valid ISO date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date must be a valid ISO date'),
  handleValidationErrors
];

// Lead export validation
export const validateLeadExport = [
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('format')
    .optional()
    .isIn(['csv'])
    .withMessage('Only CSV format is supported'),
  body('date_range')
    .optional()
    .isObject()
    .withMessage('Date range must be an object'),
  body('date_range.start')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('date_range.end')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  handleValidationErrors
];