import express from 'express';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import realtimeService from '../services/realtimeService.js';
import { prisma } from '../config/prisma.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function
async function getUserIdFromClerkId(clerkUserId) {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.id;
}

// GET /api/realtime/jobs/:jobId/subscribe - Get subscription info for job updates
router.get('/jobs/:jobId/subscribe', async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { jobId } = req.params;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        dataSource: {
          chatbots: {
            user_id: userId
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json(createErrorResponse('Job not found'));
    }

    res.json(createSuccessResponse({
      channelName: `job_${jobId}`,
      event: 'job_status_update',
      instructions: {
        library: '@supabase/supabase-js',
        example: `
const channel = supabase.channel('job_${jobId}');
channel.on('broadcast', { event: 'job_status_update' }, (payload) => {
  console.log('Job update:', payload);
});
channel.subscribe();
        `.trim()
      }
    }));

  } catch (error) {
    logger.error('Get job subscription info error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
});

// GET /api/realtime/agents/:agentId/subscribe - Get subscription info for agent updates
router.get('/agents/:agentId/subscribe', async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    res.json(createSuccessResponse({
      channelName: `agent_${agentId}_sources`,
      event: 'source_status_update',
      instructions: {
        library: '@supabase/supabase-js',
        example: `
const channel = supabase.channel('agent_${agentId}_sources');
channel.on('broadcast', { event: 'source_status_update' }, (payload) => {
  console.log('Source update:', payload);
});
channel.subscribe();
        `.trim()
      }
    }));

  } catch (error) {
    logger.error('Get agent subscription info error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
});

export default router;