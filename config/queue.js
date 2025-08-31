import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis.js';
import logger from '../utils/logger.js';

// Queue for source processing jobs
export const sourceProcessingQueue = new Queue('source-processing', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Job types
export const JOB_TYPES = {
  PROCESS_FILE: 'process_file',
  PROCESS_TEXT: 'process_text',
  CRAWL_WEBSITE: 'crawl_website',
};

// Job priorities
export const JOB_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 20,
};

// Helper function to add a job to the queue
export async function addSourceProcessingJob(jobData, options = {}) {
  const defaultOptions = {
    priority: JOB_PRIORITIES.NORMAL,
    delay: 0,
  };

  const job = await sourceProcessingQueue.add(
    jobData.type,
    jobData,
    { ...defaultOptions, ...options }
  );

  logger.info(`Added job ${job.id} of type ${jobData.type} to queue`);
  return job;
}

// Health check function
export async function isQueueHealthy() {
  try {
    const redis = getRedisConnection();
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Queue health check failed:', error);
    return false;
  }
}

export default {
  sourceProcessingQueue,
  addSourceProcessingJob,
  isQueueHealthy,
  JOB_TYPES,
  JOB_PRIORITIES,
};