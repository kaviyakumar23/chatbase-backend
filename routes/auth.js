import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleClerkWebhook, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/webhook (Clerk Webhook)
router.post('/webhook', handleClerkWebhook);

// GET /api/auth/me
router.get('/me', requireAuth, getCurrentUser);

export default router;