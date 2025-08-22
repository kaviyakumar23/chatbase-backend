import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Pinecone } from '@pinecone-database/pinecone';
import { clerkClient } from '@clerk/express';

import config from '../config/index.js';
import logger from '../utils/logger.js';

class APIKeyTester {
  constructor() {
    this.results = {
      supabase: { status: 'pending', message: '' },
      cloudflare: { status: 'pending', message: '' },
      pinecone: { status: 'pending', message: '' },
      clerk: { status: 'pending', message: '' }
    };
  }

  async testSupabase() {
    try {
      logger.info('Testing Supabase connection...');
      
      if (!config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Missing Supabase URL or Anon Key');
      }

      const supabase = createClient(config.supabase.url, config.supabase.anonKey);
      
      // Test connection by making a simple query
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      // If we get an error about table not existing, that means connection is working
      if (error && error.code === 'PGRST116') {
        this.results.supabase = { 
          status: 'success', 
          message: 'Supabase connection successful - authentication working' 
        };
        logger.info('✅ Supabase: Connection successful');
      } else if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      } else {
        this.results.supabase = { 
          status: 'success', 
          message: 'Supabase connection successful' 
        };
        logger.info('✅ Supabase: Connection successful');
      }
    } catch (error) {
      this.results.supabase = { 
        status: 'error', 
        message: error.message 
      };
      logger.error('❌ Supabase:', error.message);
    }
  }

  async testCloudflare() {
    try {
      logger.info('Testing Cloudflare R2 connection...');
      
      if (!config.cloudflare.accountId || !config.cloudflare.accessKeyId || !config.cloudflare.secretAccessKey) {
        throw new Error('Missing Cloudflare credentials');
      }

      const s3Client = new S3Client({
        region: 'auto',
        endpoint: config.cloudflare.endpoint,
        credentials: {
          accessKeyId: config.cloudflare.accessKeyId,
          secretAccessKey: config.cloudflare.secretAccessKey,
        },
        forcePathStyle: false
      });

      
(async () => {
  try {
    const res = await s3Client.send(new ListBucketsCommand({}));
    console.log(res);
  } catch (err) {
    console.error("❌", err);
  }
})();

      // Test connection by listing buckets
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      this.results.cloudflare = { 
        status: 'success', 
        message: `Connected successfully. Found ${response.Buckets?.length || 0} buckets` 
      };
      logger.info('✅ Cloudflare R2: Connection successful');
    } catch (error) {
      this.results.cloudflare = { 
        status: 'error', 
        message: error.message 
      };
      logger.error('❌ Cloudflare R2:', error.message);
    }
  }

  async testPinecone() {
    try {
      logger.info('Testing Pinecone connection...');
      
      if (!config.pinecone.apiKey || !config.pinecone.indexName) {
        throw new Error('Missing Pinecone API key or index name');
      }

      const pinecone = new Pinecone({
        apiKey: config.pinecone.apiKey,
      });

      // Test connection by describing the index
      const index = pinecone.index(config.pinecone.indexName);
      const stats = await index.describeIndexStats();
      
      this.results.pinecone = { 
        status: 'success', 
        message: `Connected successfully. Index has ${stats.totalVectorCount || 0} vectors` 
      };
      logger.info('✅ Pinecone: Connection successful');
    } catch (error) {
      this.results.pinecone = { 
        status: 'error', 
        message: error.message 
      };
      logger.error('❌ Pinecone:', error.message);
    }
  }

  async testClerk() {
    try {
      logger.info('Testing Clerk connection...');
      
      if (!config.clerk.secretKey) {
        throw new Error('Missing Clerk secret key');
      }

      // Test connection by listing users (this will fail if auth is wrong)
      // We'll just test if the client can be initialized
      const users = await clerkClient.users.getUserList({
        limit: 1
      });
      
      this.results.clerk = { 
        status: 'success', 
        message: `Connected successfully. Found ${users.length} users` 
      };
      logger.info('✅ Clerk: Connection successful');
    } catch (error) {
      this.results.clerk = { 
        status: 'error', 
        message: error.message 
      };
      logger.error('❌ Clerk:', error.message);
    }
  }

  async runAllTests() {
    logger.info('🚀 Starting API key tests...\n');
    
    await Promise.all([
      this.testSupabase(),
      this.testCloudflare(),
      this.testPinecone(),
      this.testClerk()
    ]);

    this.printResults();
  }

  printResults() {
    logger.info('\n📊 Test Results Summary:');
    logger.info('========================');
    
    Object.entries(this.results).forEach(([service, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      logger.info(`${status} ${service.toUpperCase()}: ${result.message}`);
    });

    const allPassed = Object.values(this.results).every(result => result.status === 'success');
    
    if (allPassed) {
      logger.info('\n🎉 All API keys are working correctly!');
    } else {
      logger.info('\n⚠️  Some API keys have issues. Please check the errors above.');
    }
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APIKeyTester();
  tester.runAllTests().catch(error => {
    logger.error('Test runner error:', error);
    process.exit(1);
  });
}

export default APIKeyTester;
