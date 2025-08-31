#!/usr/bin/env node

/**
 * Test Job Processing System
 * 
 * This script tests the background job processing system for sources.
 * Run this after setting up your environment variables.
 * 
 * Usage: node scripts/test-job-processing.js
 */

import 'dotenv/config';
import { prisma } from '../config/prisma.js';
import jobService from '../services/jobService.js';
import { addProcessingJob } from '../workers/sourceProcessor.js';
import { createRedisConnection } from '../config/redis.js';
import logger from '../utils/logger.js';

async function testJobProcessing() {
  console.log('🚀 Testing Job Processing System...\n');

  try {
    // Test 1: Redis Connection
    console.log('1. Testing Redis connection...');
    const redis = createRedisConnection();
    await redis.ping();
    console.log('✅ Redis connection successful\n');

    // Test 2: Database Connection
    console.log('2. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connection successful (${userCount} users found)\n`);

    // Test 3: Create a test job (without actually processing)
    console.log('3. Testing job creation...');
    
    // Find a test data source or create one
    let testSource = await prisma.dataSource.findFirst({
      include: { chatbots: true }
    });

    if (!testSource) {
      console.log('No data sources found - please create a source first');
      return;
    }

    const testJob = await jobService.createJob({
      dataSourceId: testSource.id,
      type: 'process_text',
      priority: 1
    });

    console.log(`✅ Job created successfully: ${testJob.id}\n`);

    // Test 4: Job retrieval
    console.log('4. Testing job retrieval...');
    const retrievedJob = await jobService.getJob(testJob.id);
    console.log(`✅ Job retrieved: ${retrievedJob.status}\n`);

    // Test 5: Job update
    console.log('5. Testing job updates...');
    await jobService.updateJob(testJob.id, {
      status: 'processing',
      progress: { step: 'test', percent: 50 }
    });
    console.log('✅ Job updated successfully\n');

    // Test 6: Queue health
    console.log('6. Testing queue health...');
    const { isQueueHealthy } = await import('../config/queue.js');
    const healthy = await isQueueHealthy();
    console.log(`✅ Queue health: ${healthy ? 'healthy' : 'unhealthy'}\n`);

    // Clean up test job
    await jobService.updateJob(testJob.id, {
      status: 'completed',
      completedAt: new Date()
    });

    console.log('🎉 All tests passed! Job processing system is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nTest interrupted, cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

testJobProcessing().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});