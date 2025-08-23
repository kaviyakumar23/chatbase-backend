# Chatbase Backend API

Backend API for a chatbase/chatbot platform built with Express.js, Prisma, Supabase, Cloudflare R2, and Pinecone.


### Prerequisites
- Node.js 18+ installed
- Git installed
- A code editor (VS Code recommended)
- ngrok (for webhook testing)

## 📋 Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd chatbase-backend

# Install dependencies
npm install
```

### 2. Install Required Tools

```bash
# Install Supabase CLI globally
npm install -g supabase

# Verify Supabase installation
supabase --version

# Install ngrok for webhook testing (if not already installed)
# Option 1: Using npm
npm install -g ngrok

# Option 2: Using Homebrew (macOS)
brew install ngrok

# Option 3: Download from https://ngrok.com/download

# Verify ngrok installation
ngrok version
```

### 3. Start Local Supabase Database

```bash
# Start local Supabase instance
supabase start

# This will output something like:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
# Inbucket URL: http://127.0.0.1:54324
# JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: Keep this terminal open - your local Supabase instance needs to stay running.

### 4. Apply Database Migrations

```bash
# Apply all database migrations to your local database
supabase db reset

# This will create all the necessary tables and schema
```

### 5. Setup Prisma

```bash
# Pull the database schema into Prisma
npx prisma db pull

# Generate the Prisma client
npx prisma generate

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### 6. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env
```

Now edit the `.env` file with your configuration:

```env
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=development
PORT=3000

# =============================================================================
# DATABASE CONFIGURATION (Local Supabase)
# =============================================================================
# Use the local Supabase database URL from step 3
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# =============================================================================
# SUPABASE CONFIGURATION (Local)
# =============================================================================
# Use the URLs from step 3
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # From step 3
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # From step 3

# =============================================================================
# CLERK AUTHENTICATION (Required for production)
# =============================================================================
# Get these from https://dashboard.clerk.com/
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# =============================================================================
# CLOUDFLARE R2 STORAGE (Required for file uploads)
# =============================================================================
# Get these from https://dash.cloudflare.com/
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_cloudflare_access_key_id
CLOUDFLARE_SECRET_ACCESS_KEY=your_cloudflare_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# =============================================================================
# PINECONE VECTOR DATABASE (Required for AI search)
# =============================================================================
# Get these from https://app.pinecone.io/
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_pinecone_index_name

# =============================================================================
# APPLICATION URLs (Update for your domain)
# =============================================================================
BASE_URL=http://localhost:3000
WIDGET_URL=http://localhost:3000
SHARE_URL=http://localhost:3000
```

### 7. Setup ngrok for Webhook Testing

Since Clerk webhooks require HTTPS, we need to use ngrok to expose our local server:

```bash
# Start your development server first (in one terminal)
npm run dev

# In another terminal, start ngrok to expose your local server
ngrok http 3000

# This will output something like:
# Forwarding    https://abc123.ngrok.io -> http://localhost:3000
# Forwarding    https://def456.ngrok.io -> http://localhost:3000
```

**Important**: Keep both terminals open - your server and ngrok need to stay running.

### 8. Get Required API Keys

#### Clerk Authentication (Required)
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Go to **API Keys** in the sidebar
4. Copy the **Publishable Key** and **Secret Key**
5. Go to **Webhooks** → **Add Endpoint**
   - URL: `https://your-ngrok-url.ngrok.io/api/v1/auth/webhook` (use the HTTPS URL from ngrok)
   - Events: Select `user.created`, `user.updated`, `user.deleted`
6. Copy the **Signing Secret** (starts with `whsec_`)

#### Cloudflare R2 Storage (Required for file uploads)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Create a new bucket
4. Go to **Manage R2 API tokens**
5. Create a new API token with R2 permissions
6. Copy the **Account ID**, **Access Key ID**, and **Secret Access Key**
7. Note your **Bucket Name** and **Endpoint URL**

#### Pinecone Vector Database (Required for AI search)
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new project
3. Create a new index (dimension: 1536, metric: cosine)
4. Copy the **API Key** and **Index Name**

### 9. Test Your Setup

```bash
# Test basic setup
npm run test-setup

# Test API keys
npm run test-keys

# Test database connection
npm run test-prisma
```

### 10. Start the Development Server

```bash
# Start the development server
npm run dev
```

Your API will be running at `http://localhost:3000` and accessible via ngrok at `https://your-ngrok-url.ngrok.io`

### 11. Verify Everything Works

```bash
# Test the health endpoint
curl http://localhost:3000/api/v1/health

# Should return: {"status":"ok","message":"Chatbase API is running"}
```

## 🔧 Development Workflow

### Database Changes
When you need to modify the database schema:

```bash
# 1. Create a new migration
supabase migration new your_migration_name

# 2. Edit the generated SQL file in supabase/migrations/

# 3. Apply the migration
supabase db reset

# 4. Update Prisma schema
npx prisma db pull
npx prisma generate
```

### Viewing Your Database
```bash
# Open Prisma Studio (web interface)
npx prisma studio

# Or use Supabase Studio
# Open http://127.0.0.1:54323 in your browser
```

### Stopping Local Services
```bash
# Stop local Supabase
supabase stop

# Stop ngrok (Ctrl+C in the ngrok terminal)

# To start again later
supabase start
ngrok http 3000
```

## 🚨 Common Issues & Solutions

### "Cannot fetch data from service: fetch failed"
**Cause**: Wrong DATABASE_URL format

**Solution**: Ensure your DATABASE_URL uses the local Supabase format:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

### "The introspected database was empty"
**Cause**: Database migrations haven't been applied

**Solution**:
```bash
supabase db reset
npx prisma db pull
npx prisma generate
```

### "Migration asking for name"
**Cause**: Trying to use Prisma migrations instead of Supabase migrations

**Solution**: Cancel (Ctrl+C) and use Supabase migrations:
```bash
supabase db reset
npx prisma db pull
npx prisma generate
```

### "Webhook signature verification failed"
**Cause**: Missing or incorrect CLERK_WEBHOOK_SECRET

**Solution**:
1. Get the correct secret from Clerk Dashboard → Webhooks
2. Ensure it starts with `whsec_`
3. Restart your server after updating .env

### Supabase CLI not found
**Solution**:
```bash
npm install -g supabase
# Or if you have issues with global install:
npx supabase start
```

### ngrok not found
**Solution**:
```bash
# Install ngrok
npm install -g ngrok
# Or download from https://ngrok.com/download
```

### Webhook not receiving events
**Cause**: Wrong ngrok URL or ngrok not running

**Solution**:
1. Ensure ngrok is running: `ngrok http 3000`
2. Copy the HTTPS URL from ngrok output
3. Update webhook URL in Clerk Dashboard with the new ngrok URL
4. Test webhook delivery in Clerk Dashboard