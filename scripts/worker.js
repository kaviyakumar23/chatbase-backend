#!/usr/bin/env node

/**
 * Background Worker Process
 * 
 * This script runs the BullMQ worker process for processing source jobs.
 * It can be run separately from the main server for better resource management.
 * 
 * Usage:
 *   node scripts/worker.js
 *   npm run worker (add this to package.json scripts)
 */

import 'dotenv/config';
import logger from '../utils/logger.js';
import { createRedisConnection } from '../config/redis.js';
import jobService from '../services/jobService.js';

// Import the worker (this will initialize it)
import sourceWorker from '../workers/sourceProcessor.js';

async function startWorker() {
  logger.info('Starting source processing worker...');

  try {
    // Test Redis connection
    const redis = createRedisConnection();
    await redis.ping();
    logger.info('Redis connection established');

    // Log worker configuration
    logger.info(`Worker concurrency: ${process.env.JOB_CONCURRENCY || 3}`);
    logger.info(`Max job attempts: ${process.env.JOB_MAX_RETRIES || 3}`);

    // Set up periodic cleanup of old jobs
    setInterval(async () => {
      try {
        await jobService.cleanupOldJobs();
      } catch (error) {
        logger.error('Error during job cleanup:', error);
      }
    }, 60 * 60 * 1000); // Run every hour

    logger.info('Source processing worker is ready!');
    logger.info('Waiting for jobs...');

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
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

// Start the worker
startWorker().catch((error) => {
  logger.error('Worker startup failed:', error);
  process.exit(1);
});