import express from 'express';
import authRoutes from './auth.js';
import agentRoutes from './agents.js';
import sourceRoutes from './sources.js';
import chatRoutes from './chat.js';
import leadsRoutes from './leads.js';
import deployRoutes from './deploy.js';
import publicRoutes from './public.js';
import usageRoutes from './usage.js';
import jobRoutes from './jobs.js';
import realtimeRoutes from './realtime.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chatbase API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/agents', agentRoutes);
router.use('/agents', sourceRoutes);  // Source routes use /agents/:agentId prefix
router.use('/agents', chatRoutes);    // Chat routes use /agents/:agentId prefix
router.use('/agents', leadsRoutes);   // Leads routes use /agents/:agentId prefix
router.use('/agents', deployRoutes);  // Deploy routes use /agents/:agentId prefix
router.use('/jobs', jobRoutes);       // Job management routes
router.use('/realtime', realtimeRoutes); // Real-time subscription info
router.use('/public', publicRoutes);
router.use('/usage', usageRoutes);

export default router;