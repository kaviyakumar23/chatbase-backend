#!/usr/bin/env node

/**
 * Test script for Prisma setup
 * This script tests the Prisma connection and basic operations
 */

import dotenv from 'dotenv';
import { prisma } from '../config/prisma.js';
import prismaService from '../services/prismaService.js';

// Load environment variables
dotenv.config();

async function testPrismaConnection() {
  console.log('🔍 Testing Prisma database connection...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Prisma connection successful');
    
    // Test health check
    const health = await prismaService.healthCheck();
    console.log('✅ Database health check:', health);
    
    // Test basic query
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    const chatbotCount = await prisma.chatbot.count();
    console.log(`✅ Found ${chatbotCount} chatbots in database`);
    
    console.log('\n📊 Database schema information:');
    
    // Get table information using raw query
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('📋 Available tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`);
    });
    
    console.log('\n🎉 All Prisma tests passed!');
    
  } catch (error) {
    console.error('❌ Prisma test failed:', error.message);
    
    if (error.code === 'P1001') {
      console.error('💡 Hint: Check your DATABASE_URL environment variable');
    } else if (error.code === 'P1008') {
      console.error('💡 Hint: Database connection timeout - check your network');
    } else if (error.code === 'P1017') {
      console.error('💡 Hint: Database server is not reachable');
    }
    
    console.error('\n🔧 Debug information:');
    console.error('- DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.error('- DATABASE_URL starts with postgresql:', process.env.DATABASE_URL?.startsWith('postgresql:'));
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function testPrismaOperations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('💡 Please set your DATABASE_URL in a .env file or environment variables');
    console.log('💡 Format: postgresql://postgres:[password]@[host]:[port]/[database]');
    return;
  }
  
  console.log('🚀 Starting Prisma tests...\n');
  
  try {
    await testPrismaConnection();
    
    // Optional: Test CRUD operations if database is empty
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('\n🧪 Testing CRUD operations with sample data...');
      
      // This would only run if database is empty
      console.log('⚠️  Skipping CRUD tests - run with --create-sample to test with sample data');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPrismaOperations();
}
