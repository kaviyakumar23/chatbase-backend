import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import sourceProcessorService from '../services/sourceProcessorService.js';
import jobService from '../services/jobService.js';
import realtimeService from '../services/realtimeService.js';
import logger from '../utils/logger.js';

const QUEUE_NAME = 'source-processing';

// Create worker to process source jobs
const sourceWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { jobId, dataSourceId, type } = job.data;
    
    logger.info(`Processing job ${jobId} of type ${type} for source ${dataSourceId}`);
    
    try {
      // Process the source
      const result = await sourceProcessorService.processSource(jobId, dataSourceId, type);
      
      // Publish real-time update via Supabase
      await realtimeService.publishJobUpdate(jobId, {
        status: 'completed',
        progress: { step: 'completed', percent: 100 },
        result
      });
      
      return result;
    } catch (error) {
      logger.error(`Job ${jobId} failed:`, error);
      
      // Publish failure update
      await realtimeService.publishJobUpdate(jobId, {
        status: 'failed',
        errorMessage: error.message
      });
      
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: parseInt(process.env.JOB_CONCURRENCY || '3'), // Process up to 3 jobs simultaneously
    removeOnComplete: 50,
    removeOnFail: 100,
  }
);

// Worker event handlers
sourceWorker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`, { result });
});

sourceWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

// Progress event handler with real-time updates
sourceWorker.on('progress', async (job, progress) => {
  try {
    const { jobId } = job.data;
    logger.info(`Job ${job.id} progress: ${progress}%`);
    
    await realtimeService.publishJobUpdate(jobId, {
      status: 'processing',
      progress: { percent: progress }
    });
  } catch (error) {
    logger.warn('Failed to publish progress update:', error);
  }
});

sourceWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down worker gracefully...');
  await sourceWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down worker gracefully...');
  await sourceWorker.close();
  process.exit(0);
});

// Job queue instance for adding jobs
export const sourceProcessingQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Helper function to add processing jobs
export async function addProcessingJob(jobData, options = {}) {
  const job = await sourceProcessingQueue.add(
    jobData.type,
    jobData,
    {
      priority: options.priority || 5,
      delay: options.delay || 0,
      ...options
    }
  );
  
  logger.info(`Added job ${job.id} to processing queue`);
  return job;
}

// Export worker for external management
export default sourceWorker;