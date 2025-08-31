import { prisma } from '../config/prisma.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import jobService from '../services/jobService.js';
import { addProcessingJob } from '../workers/sourceProcessor.js';
import logger from '../utils/logger.js';
import { convertPrismaToApiResponse, convertPrismaArrayToApiResponse } from '../utils/caseConverter.js';

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

// GET /api/jobs/:jobId - Get job status
export const getJobStatus = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { jobId } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        dataSource: {
          chatbots: {
            user_id: userId
          }
        }
      },
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json(createErrorResponse('Job not found'));
    }

    const response = convertPrismaToApiResponse(job, 'job');
    res.json(createSuccessResponse(response));

  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:agentId/jobs - Get all jobs for an agent
export const getAgentJobs = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId } = req.params;
    const { status, limit = 50 } = req.query;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    const whereCondition = {
      dataSource: {
        chatbot_id: agentId
      }
    };

    if (status) {
      whereCondition.status = status;
    }

    const jobs = await prisma.job.findMany({
      where: whereCondition,
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const response = {
      jobs: convertPrismaArrayToApiResponse(jobs, 'job')
    };

    res.json(createSuccessResponse(response));

  } catch (error) {
    logger.error('Get agent jobs error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// GET /api/agents/:agentId/sources/:sourceId/jobs - Get jobs for a specific source
export const getSourceJobs = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { agentId, sourceId } = req.params;

    // Verify agent ownership
    const agent = await prisma.chatbots.findFirst({
      where: { id: agentId, user_id: userId }
    });

    if (!agent) {
      return res.status(404).json(createErrorResponse('Agent not found'));
    }

    // Verify source belongs to agent
    const source = await prisma.dataSource.findFirst({
      where: { id: sourceId, chatbot_id: agentId }
    });

    if (!source) {
      return res.status(404).json(createErrorResponse('Source not found'));
    }

    const jobs = await jobService.getJobsForDataSource(sourceId);
    const response = {
      jobs: convertPrismaArrayToApiResponse(jobs, 'job')
    };

    res.json(createSuccessResponse(response));

  } catch (error) {
    logger.error('Get source jobs error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// POST /api/jobs/:jobId/retry - Retry a failed job
export const retryJob = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { jobId } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        dataSource: {
          chatbots: {
            user_id: userId
          }
        }
      },
      include: {
        dataSource: true
      }
    });

    if (!job) {
      return res.status(404).json(createErrorResponse('Job not found'));
    }

    if (job.status !== 'failed') {
      return res.status(400).json(createErrorResponse('Only failed jobs can be retried'));
    }

    // Reset job status
    const updatedJob = await jobService.updateJob(jobId, {
      status: 'pending',
      errorMessage: null,
      startedAt: null,
      completedAt: null
    });

    // Add back to queue
    await addProcessingJob({
      jobId: job.id,
      dataSourceId: job.dataSourceId,
      type: job.type
    });

    const response = convertPrismaToApiResponse(updatedJob, 'job');
    res.json(createSuccessResponse(response));

  } catch (error) {
    logger.error('Retry job error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};

// DELETE /api/jobs/:jobId - Cancel a job (only if pending or processing)
export const cancelJob = async (req, res) => {
  try {
    const userId = await getUserIdFromClerkId(req.auth.userId);
    const { jobId } = req.params;

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

    if (!['pending', 'processing'].includes(job.status)) {
      return res.status(400).json(createErrorResponse('Only pending or processing jobs can be cancelled'));
    }

    // Update job status to cancelled
    await jobService.updateJob(jobId, {
      status: 'cancelled',
      completedAt: new Date()
    });

    res.json(createSuccessResponse({
      success: true,
      message: 'Job cancelled successfully'
    }));

  } catch (error) {
    logger.error('Cancel job error:', error);
    res.status(500).json(createErrorResponse('Internal server error'));
  }
};