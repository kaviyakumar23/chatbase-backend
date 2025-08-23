import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  validateCreateAgent,
  validateUpdateAgent,
  validateUUIDParam
} from '../middleware/validation.js';
import {
  getAgents,
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent
} from '../controllers/agentController.js';

const router = express.Router();

// GET /api/agents
router.get('/', requireAuth, getAgents);

// POST /api/agents
router.post('/', requireAuth, validateCreateAgent, createAgent);

// GET /api/agents/:id
router.get('/:id', requireAuth, validateUUIDParam('id'), getAgent);

// PUT /api/agents/:id
router.put('/:id', requireAuth, validateUpdateAgent, updateAgent);

// DELETE /api/agents/:id
router.delete('/:id', requireAuth, validateUUIDParam('id'), deleteAgent);

export default router;