const config = require('../config');
const logger = require('../utils/logger');

async function testSetup() {
  logger.info('Testing backend setup...');
  
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'CLERK_SECRET_KEY',
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_ACCESS_KEY_ID',
    'PINECONE_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars);
    logger.info('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  try {
    const { supabase } = require('../config/database');
    const { r2Client } = require('../config/storage');
    const { pinecone } = require('../config/vector');
    
    logger.info('✓ All configurations loaded successfully');
    logger.info('✓ Supabase client initialized');
    logger.info('✓ Cloudflare R2 client initialized');
    logger.info('✓ Pinecone client initialized');
    
    logger.info('Setup test completed successfully!');
    logger.info('You can now start the server with: npm run dev');
    
  } catch (error) {
    logger.error('Setup test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testSetup();
}

module.exports = testSetup;