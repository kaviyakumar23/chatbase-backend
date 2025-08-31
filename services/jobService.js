import { prisma } from '../config/prisma.js';
import logger from '../utils/logger.js';

class JobService {
  // Create a new job
  async createJob({ dataSourceId, type, priority = 0, scheduledFor = null, progress = {} }) {
    try {
      const job = await prisma.job.create({
        data: {
          dataSourceId,
          type,
          priority,
          scheduledFor,
          progress,
          status: 'pending'
        }
      });
      
      logger.info(`Created job ${job.id} of type ${type} for source ${dataSourceId}`);
      return job;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }

  // Update job status and metadata
  async updateJob(jobId, updates) {
    try {
      const allowedUpdates = {
        status: updates.status,
        progress: updates.progress,
        result: updates.result,
        errorMessage: updates.errorMessage,
        attempts: updates.attempts,
        startedAt: updates.startedAt,
        completedAt: updates.completedAt
      };

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );

      const job = await prisma.job.update({
        where: { id: jobId },
        data: cleanUpdates,
        include: {
          dataSource: {
            include: {
              chatbots: true
            }
          }
        }
      });
      
      return job;
    } catch (error) {
      logger.error('Error updating job:', error);
      throw new Error(`Failed to update job: ${error.message}`);
    }
  }

  // Get job by ID
  async getJob(jobId) {
    try {
      return await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          dataSource: {
            include: {
              chatbots: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting job:', error);
      throw new Error(`Failed to get job: ${error.message}`);
    }
  }

  // Get jobs for a data source
  async getJobsForDataSource(dataSourceId) {
    try {
      return await prisma.job.findMany({
        where: { dataSourceId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting jobs for data source:', error);
      throw new Error(`Failed to get jobs: ${error.message}`);
    }
  }

  // Get pending jobs
  async getPendingJobs(limit = 10) {
    try {
      return await prisma.job.findMany({
        where: { 
          status: 'pending',
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date() } }
          ]
        },
        include: {
          dataSource: {
            include: {
              chatbots: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: limit
      });
    } catch (error) {
      logger.error('Error getting pending jobs:', error);
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }
  }

  // Mark job as failed and handle retry logic
  async handleJobFailure(jobId, error, shouldRetry = true) {
    try {
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const newAttempts = job.attempts + 1;
      const shouldRetryJob = shouldRetry && newAttempts < job.maxAttempts;

      const updates = {
        attempts: newAttempts,
        errorMessage: error.message,
        status: shouldRetryJob ? 'pending' : 'failed'
      };

      if (!shouldRetryJob) {
        updates.completedAt = new Date();
      }

      return await this.updateJob(jobId, updates);
    } catch (error) {
      logger.error('Error handling job failure:', error);
      throw new Error(`Failed to handle job failure: ${error.message}`);
    }
  }

  // Clean up old completed/failed jobs
  async cleanupOldJobs(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.job.deleteMany({
        where: {
          OR: [
            { status: 'completed' },
            { status: 'failed' }
          ],
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${result.count} old jobs`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up jobs:', error);
      throw new Error(`Failed to cleanup jobs: ${error.message}`);
    }
  }
}

export default new JobService();