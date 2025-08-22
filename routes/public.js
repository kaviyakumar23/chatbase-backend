import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  validatePublicSendMessage,
  validateCapturePublicLead
} from '../middleware/validation.js';
import {
  getAgentConfig,
  sendPublicMessage,
  capturePublicLead
} from '../controllers/publicController.js';

const router = express.Router();

// Rate limiting for public endpoints
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat requests per minute
  message: {
    success: false,
    message: 'Too many chat requests, please slow down.'
  }
});

// GET /api/public/agents/:publicId/config
router.get('/agents/:publicId/config', publicRateLimit, getAgentConfig);

// POST /api/public/agents/:publicId/chat
router.post('/agents/:publicId/chat', chatRateLimit, validatePublicSendMessage, sendPublicMessage);

// POST /api/public/agents/:publicId/lead
router.post('/agents/:publicId/lead', publicRateLimit, validateCapturePublicLead, capturePublicLead);

export default router;