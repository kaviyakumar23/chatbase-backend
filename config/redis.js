import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redis = null;

export function createRedisConnection() {
  if (redis) {
    return redis;
  }

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
  };

  // For development, use local Redis if no host specified
  if (!process.env.REDIS_HOST && process.env.NODE_ENV === 'development') {
    logger.info('Using local Redis for development');
  }

  redis = new Redis(redisConfig);

  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redis.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redis;
}

export function getRedisConnection() {
  if (!redis) {
    return createRedisConnection();
  }
  return redis;
}

export default { createRedisConnection, getRedisConnection };