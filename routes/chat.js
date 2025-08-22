import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  validateSendMessage,
  validateUUIDParam,
  validatePagination,
  validateDateRange
} from '../middleware/validation.js';
import {
  sendMessage,
  getChatLogs,
  getChatSession
} from '../controllers/chatController.js';

const router = express.Router();

// POST /api/agents/:agentId/chat (Widget API - needs auth for private usage)
router.post('/:agentId/chat', requireAuth, validateSendMessage, sendMessage);

// GET /api/agents/:agentId/chat-logs
router.get('/:agentId/chat-logs', requireAuth, validateUUIDParam('agentId'), validatePagination, validateDateRange, getChatLogs);

// GET /api/agents/:agentId/chat-logs/:sessionId
router.get('/:agentId/chat-logs/:sessionId', requireAuth, validateUUIDParam('agentId'), getChatSession);

export default router;