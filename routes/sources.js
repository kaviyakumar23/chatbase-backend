import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  validateCreateTextSource,
  validateCreateWebsiteSource,
  validateUUIDParam,
  validatePagination
} from '../middleware/validation.js';
import {
  getSources,
  createFileSource,
  createWebsiteSource,
  createTextSource,
  deleteSource,
  reprocessSource,
  upload
} from '../controllers/sourceController.js';

const router = express.Router();

// GET /api/agents/:agentId/sources
router.get('/:agentId/sources', requireAuth, validateUUIDParam('agentId'), validatePagination, getSources);

// POST /api/agents/:agentId/sources/file
router.post('/:agentId/sources/file', requireAuth, validateUUIDParam('agentId'), upload.single('file'), createFileSource);

// POST /api/agents/:agentId/sources/website
router.post('/:agentId/sources/website', requireAuth, validateCreateWebsiteSource, createWebsiteSource);

// POST /api/agents/:agentId/sources/text
router.post('/:agentId/sources/text', requireAuth, validateCreateTextSource, createTextSource);

// DELETE /api/agents/:agentId/sources/:sourceId
router.delete('/:agentId/sources/:sourceId', requireAuth, validateUUIDParam('agentId'), validateUUIDParam('sourceId'), deleteSource);

// POST /api/agents/:agentId/sources/:sourceId/reprocess
router.post('/:agentId/sources/:sourceId/reprocess', requireAuth, validateUUIDParam('agentId'), validateUUIDParam('sourceId'), reprocessSource);

export default router;