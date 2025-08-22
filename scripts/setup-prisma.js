#!/usr/bin/env node

/**
 * Prisma Setup Script
 * This script helps set up Prisma with Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function createEnvTemplate() {
  const envTemplatePath = path.join(projectRoot, '.env.template');
  const envTemplate = `# Database Configuration for Prisma + Supabase
# Copy this file to .env and fill in your actual values

# Database URL for Prisma (PostgreSQL connection string)
# Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Supabase Configuration
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"

# Clerk Authentication
CLERK_PUBLISHABLE_KEY="YOUR_CLERK_PUBLISHABLE_KEY"
CLERK_SECRET_KEY="YOUR_CLERK_SECRET_KEY"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="YOUR_R2_ACCOUNT_ID"
R2_ACCESS_KEY_ID="YOUR_R2_ACCESS_KEY"
R2_SECRET_ACCESS_KEY="YOUR_R2_SECRET_KEY"
R2_BUCKET_NAME="YOUR_R2_BUCKET_NAME"
R2_PUBLIC_URL="YOUR_R2_PUBLIC_URL"

# Pinecone Vector Database
PINECONE_API_KEY="YOUR_PINECONE_API_KEY"
PINECONE_ENVIRONMENT="YOUR_PINECONE_ENVIRONMENT"
PINECONE_INDEX_NAME="YOUR_PINECONE_INDEX_NAME"

# OpenAI
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

# Application
NODE_ENV="development"
PORT=3000
`;

  try {
    fs.writeFileSync(envTemplatePath, envTemplate);
    console.log('✅ Created .env.template file');
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env.template:', error.message);
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(projectRoot, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found');
    return false;
  }
  
  console.log('✅ Found .env file');
  return true;
}

function validatePrismaSetup() {
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const clientPath = path.join(projectRoot, 'generated', 'prisma');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Prisma schema not found');
    return false;
  }
  
  if (!fs.existsSync(clientPath)) {
    console.log('⚠️  Prisma client not generated. Run: npm run prisma:generate');
    return false;
  }
  
  console.log('✅ Prisma schema and client found');
  return true;
}

function printSetupInstructions() {
  console.log(`
🚀 Prisma Setup Instructions

1. Environment Setup:
   ${!checkEnvFile() ? '⚠️  Create .env file from .env.template' : '✅ .env file exists'}
   
2. Database Configuration:
   📝 Update your .env file with:
   - DATABASE_URL: Your Supabase PostgreSQL connection string
   - SUPABASE_URL: Your Supabase project URL
   - SUPABASE_ANON_KEY: Your Supabase anonymous key
   - SUPABASE_SERVICE_KEY: Your Supabase service role key

3. Generate Prisma Client:
   ${validatePrismaSetup() ? '✅ Prisma client generated' : '⚠️  Run: npm run prisma:generate'}

4. Test Connection:
   🧪 Run: npm run test-prisma

📚 Documentation:
   - Full setup guide: ./PRISMA_SETUP.md
   - Supabase docs: https://supabase.io/docs
   - Prisma docs: https://prisma.io/docs

🔗 Quick Commands:
   npm run prisma:generate     # Generate Prisma client
   npm run prisma:studio       # Open database browser
   npm run test-prisma         # Test database connection
   npm run prisma:migrate      # Create migrations (dev)
`);
}

function main() {
  console.log('🔧 Prisma Setup Checker\n');
  
  // Create environment template
  createEnvTemplate();
  
  // Print setup instructions
  printSetupInstructions();
  
  // Check current status
  console.log('\n📋 Current Status:');
  
  const hasEnv = checkEnvFile();
  const hasPrisma = validatePrismaSetup();
  
  if (hasEnv && hasPrisma) {
    console.log('\n🎉 Setup looks good! Try running: npm run test-prisma');
  } else {
    console.log('\n⚠️  Setup incomplete. Follow the instructions above.');
  }
}

main();
