#!/usr/bin/env node

/**
 * Setup Script for Job Processing System
 * 
 * This script helps set up and verify the job processing system.
 * 
 * Usage: node scripts/setup-jobs.js
 */

import 'dotenv/config';
import logger from '../utils/logger.js';

console.log('🔧 Setting up Job Processing System...\n');

// Check required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'PINECONE_API_KEY',
  'PINECONE_INDEX_NAME'
];

const optionalEnvVars = [
  'REDIS_HOST',
  'REDIS_PORT',
  'OPENAI_API_KEY'
];

console.log('📋 Checking Environment Variables:');

let hasErrors = false;

// Check required variables
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing (REQUIRED)`);
    hasErrors = true;
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Missing (optional, will use defaults)`);
  }
});

if (hasErrors) {
  console.log('\n❌ Please set the required environment variables before proceeding.');
  console.log('💡 Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

console.log('\n🎯 Setup Instructions:');
console.log('1. Run database migration:');
console.log('   - If using Supabase: Apply the migration in supabase/migrations/');
console.log('   - If using Prisma: npx prisma migrate dev');
console.log('');
console.log('2. Start Redis server (if running locally):');
console.log('   redis-server');
console.log('');
console.log('3. Start the application:');
console.log('   npm run dev           # Main server with integrated worker');
console.log('   npm run worker        # Or run worker separately');
console.log('');
console.log('4. Test the system:');
console.log('   npm run test:jobs     # Run job processing tests');
console.log('');

console.log('🚀 Job Processing System setup verification complete!');
console.log('📖 See docs/JOB_PROCESSING.md for detailed documentation.');