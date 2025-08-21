const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth, handleValidationErrors } = require('../middleware');
const {
  upsertVectors,
  queryVectors,
  queryById,
  fetchVectors,
  deleteVectors,
  updateVector,
  getIndexStats,
  batchUpsert
} = require('../controllers/vectorController');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', getIndexStats);

router.post('/upsert', [
  body('vectors').isArray().withMessage('Vectors must be an array'),
  body('vectors.*.id').notEmpty().withMessage('Vector ID is required'),
  body('vectors.*.values').isArray().withMessage('Vector values must be an array'),
  handleValidationErrors
], upsertVectors);

router.post('/batch-upsert', [
  body('vectors').isArray().withMessage('Vectors must be an array'),
  body('vectors.*.id').notEmpty().withMessage('Vector ID is required'),
  body('vectors.*.values').isArray().withMessage('Vector values must be an array'),
  body('batchSize').optional().isInt({ min: 1, max: 1000 }).withMessage('Batch size must be between 1 and 1000'),
  handleValidationErrors
], batchUpsert);

router.post('/query', [
  body('vector').isArray().withMessage('Vector must be an array'),
  body('topK').optional().isInt({ min: 1, max: 10000 }).withMessage('TopK must be between 1 and 10000'),
  body('includeMetadata').optional().isBoolean().withMessage('includeMetadata must be boolean'),
  body('includeValues').optional().isBoolean().withMessage('includeValues must be boolean'),
  handleValidationErrors
], queryVectors);

router.get('/query/:id', [
  param('id').notEmpty().withMessage('Vector ID is required'),
  query('topK').optional().isInt({ min: 1, max: 10000 }).withMessage('TopK must be between 1 and 10000'),
  handleValidationErrors
], queryById);

router.post('/fetch', [
  body('ids').isArray().withMessage('IDs must be an array'),
  handleValidationErrors
], fetchVectors);

router.delete('/', [
  body('ids').isArray().withMessage('IDs must be an array'),
  handleValidationErrors
], deleteVectors);

router.put('/:id', [
  param('id').notEmpty().withMessage('Vector ID is required'),
  body('values').isArray().withMessage('Values must be an array'),
  handleValidationErrors
], updateVector);

module.exports = router;