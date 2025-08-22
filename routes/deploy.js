import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  validateUpdateDeploySettings,
  validateUpdateIntegrations,
  validateUUIDParam
} from '../middleware/validation.js';
import {
  getDeploySettings,
  updateDeploySettings,
  getIntegrations,
  updateIntegrations
} from '../controllers/deployController.js';

const router = express.Router();

// GET /api/agents/:agentId/deploy-settings
router.get('/:agentId/deploy-settings', requireAuth, validateUUIDParam('agentId'), getDeploySettings);

// PUT /api/agents/:agentId/deploy-settings
router.put('/:agentId/deploy-settings', requireAuth, validateUpdateDeploySettings, updateDeploySettings);

// GET /api/agents/:agentId/integrations
router.get('/:agentId/integrations', requireAuth, validateUUIDParam('agentId'), getIntegrations);

// PUT /api/agents/:agentId/integrations
router.put('/:agentId/integrations', requireAuth, validateUpdateIntegrations, updateIntegrations);

export default router;