# Job Processing System

This document explains the background job processing system for handling source uploads, text processing, and website crawling.

## Overview

The system uses **BullMQ** with **Redis** to manage background jobs for processing different types of sources:
- 📄 **File Processing**: Extract text from PDF, DOCX, CSV, JSON, TXT, and MD files
- 🌐 **Website Crawling**: Scrape and extract content from websites
- 📝 **Text Processing**: Process direct text input and generate embeddings

All processed content is chunked, embedded using OpenAI's embedding API, and stored in Pinecone for vector search.

## Database Schema

### Jobs Table

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'process_file', 'process_text', 'crawl_website'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    progress JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Source Management (Enhanced)

All source creation endpoints now return a `jobId` for tracking processing status:

```javascript
// Response format for source creation
{
  "success": true,
  "data": {
    "id": "source-uuid",
    "name": "My Document",
    "type": "file",
    "status": "pending",
    "jobId": "job-uuid",  // ← New: Use this to track progress
    // ... other fields
  }
}
```

### Job Management

- **GET** `/api/jobs/:jobId` - Get job status
- **GET** `/api/agents/:agentId/jobs` - Get all jobs for an agent
- **GET** `/api/agents/:agentId/sources/:sourceId/jobs` - Get jobs for a source
- **POST** `/api/jobs/:jobId/retry` - Retry a failed job
- **DELETE** `/api/jobs/:jobId` - Cancel a pending/processing job

### Real-time Updates

- **GET** `/api/realtime/jobs/:jobId/subscribe` - Get subscription info for job updates
- **GET** `/api/realtime/agents/:agentId/subscribe` - Get subscription info for agent updates

## Job Processing Flow

### 1. Source Creation
```javascript
// When user creates a source:
POST /api/agents/{agentId}/sources/file
├── Create DataSource record (status: 'pending')
├── Create Job record (status: 'pending')  
├── Add job to BullMQ queue
└── Return source + jobId
```

### 2. Background Processing
```javascript
// Worker picks up job:
Worker receives job
├── Update job status to 'processing'
├── Download/extract content (for files/websites)
├── Chunk text content
├── Generate embeddings (OpenAI)
├── Store vectors in Pinecone
├── Update job status to 'completed'
└── Publish real-time updates via Supabase
```

### 3. Real-time Status Updates
```javascript
// Frontend can subscribe to updates:
const channel = supabase.channel('job_${jobId}');
channel.on('broadcast', { event: 'job_status_update' }, (payload) => {
  console.log('Progress:', payload.progress);
  console.log('Status:', payload.status);
});
channel.subscribe();
```

## Job Types and Processing

### Text Processing (`process_text`)
- **Priority**: High (10) - immediate processing
- **Steps**: Process text → Chunk → Generate embeddings → Store vectors
- **Duration**: Usually < 30 seconds

### File Processing (`process_file`) 
- **Priority**: Normal (5)
- **Supported formats**: PDF, DOCX, CSV, JSON, TXT, MD
- **Steps**: Download from R2 → Extract text → Chunk → Generate embeddings → Store vectors
- **Duration**: 1-5 minutes depending on file size

### Website Crawling (`crawl_website`)
- **Priority**: Low (3) - most resource intensive
- **Features**: Configurable subpage crawling, max pages limit
- **Steps**: Crawl pages → Extract content → Chunk → Generate embeddings → Store vectors  
- **Duration**: 2-15 minutes depending on pages crawled

## Configuration

### Environment Variables

```bash
# Redis (required for job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Job Processing
JOB_CONCURRENCY=3        # Number of parallel jobs
JOB_MAX_RETRIES=3        # Max retry attempts
JOB_CLEANUP_DAYS=7       # Days to keep completed jobs

# OpenAI (required for embeddings)
OPENAI_API_KEY=your_openai_api_key
```

### Running the Worker

The worker can run in two modes:

**Integrated Mode** (default):
```bash
npm start  # Worker starts with main server
```

**Separate Worker Process**:
```bash
npm run worker  # Run worker separately
# or
npm run dev:worker  # Development mode with nodemon
```

## Error Handling

### Automatic Retries
- Jobs automatically retry up to 3 times with exponential backoff
- Failed jobs can be manually retried via API

### Monitoring
- Job status updates are published in real-time
- Failed jobs include detailed error messages
- Worker logs all processing steps

## Vector Storage

### Pinecone Metadata
Each chunk stored in Pinecone includes:
```javascript
{
  source_id: "uuid",
  agent_id: "uuid", 
  chunk_index: 0,
  text: "chunk content",
  char_count: 150,
  word_count: 25,
  namespace: "agent-namespace",
  created_at: "2025-01-15T10:00:00Z"
}
```

### Cleanup on Deletion
When a source is deleted:
1. Cancel pending jobs
2. Delete vectors from Pinecone by filter
3. Delete source record (cascade deletes jobs)

## Testing

Run the test script to verify everything is working:

```bash
node scripts/test-job-processing.js
```

This will test:
- Redis connectivity
- Database connectivity  
- Job creation and retrieval
- Queue health
- Job status updates

## Production Considerations

1. **Redis Setup**: Use a managed Redis service in production
2. **Worker Scaling**: Run multiple worker processes for higher throughput
3. **Monitoring**: Set up alerts for failed jobs and queue health
4. **Rate Limiting**: OpenAI API has rate limits - monitor usage
5. **Storage**: Monitor Pinecone usage and vector storage costs