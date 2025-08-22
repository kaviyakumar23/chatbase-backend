import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUsage } from '../controllers/usageController.js';

const router = express.Router();

// GET /api/usage
router.get('/', requireAuth, getUsage);

export default router;