import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  validateUUIDParam,
  validatePagination,
  validateLeadExport
} from '../middleware/validation.js';
import {
  getLeads,
  updateLead,
  exportLeads
} from '../controllers/leadsController.js';

const router = express.Router();

// GET /api/agents/:agentId/leads
router.get('/:agentId/leads', requireAuth, validateUUIDParam('agentId'), validatePagination, getLeads);

// PUT /api/agents/:agentId/leads/:leadId
router.put('/:agentId/leads/:leadId', requireAuth, validateUUIDParam('agentId'), validateUUIDParam('leadId'), updateLead);

// POST /api/agents/:agentId/leads/export
router.post('/:agentId/leads/export', requireAuth, validateLeadExport, exportLeads);

export default router;