import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { verifyClerkWebhook } from '../middleware/webhookVerification.js';
import { handleClerkWebhook, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/webhook (Clerk Webhook)
// Apply webhook verification middleware before handling the webhook
router.post('/webhook', verifyClerkWebhook, handleClerkWebhook);

// GET /api/auth/me
router.get('/me', requireAuth, getCurrentUser);

export default router;