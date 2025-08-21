# Chatbase Backend

A production-ready Node.js backend with Express, featuring integrations with Supabase, Cloudflare R2, Pinecone, and Clerk authentication.

## Features

- **Express.js** - Fast, unopinionated web framework
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Cloudflare R2** - Object storage for files
- **Pinecone** - Vector database for semantic search
- **Clerk** - JWT authentication middleware
- **Production Ready** - Error handling, rate limiting, compression, security headers

## Project Structure

```
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Utility functions
├── .env.example    # Environment variables template
└── index.js        # Main application file
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

3. **Configure Services**
   - Set up Supabase project and get URL/keys
   - Configure Cloudflare R2 bucket and access keys
   - Create Pinecone index and get API key
   - Set up Clerk application and get keys

4. **Run the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Health Check
- `GET /api/v1/health` - Server status

### Users (Supabase)
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users` - List users (paginated)
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Files (Cloudflare R2)
- `POST /api/v1/files/upload` - Upload single file
- `POST /api/v1/files/upload/multiple` - Upload multiple files
- `GET /api/v1/files/download/:key` - Download file
- `DELETE /api/v1/files/:key` - Delete file
- `POST /api/v1/files/presigned-upload` - Get presigned upload URL
- `GET /api/v1/files/presigned-download/:key` - Get presigned download URL

### Vectors (Pinecone)
- `GET /api/v1/vectors/stats` - Index statistics
- `POST /api/v1/vectors/upsert` - Insert/update vectors
- `POST /api/v1/vectors/batch-upsert` - Batch insert vectors
- `POST /api/v1/vectors/query` - Query vectors by similarity
- `GET /api/v1/vectors/query/:id` - Query vectors by ID
- `POST /api/v1/vectors/fetch` - Fetch vectors by IDs
- `DELETE /api/v1/vectors` - Delete vectors
- `PUT /api/v1/vectors/:id` - Update vector

### Examples
- `POST /api/v1/examples/complete-workflow` - Demonstrates all integrations
- `GET /api/v1/examples/semantic-search/:query` - Semantic search example
- `GET /api/v1/examples/user-analytics/:userId` - User analytics
- `POST /api/v1/examples/bulk-operations` - Bulk operations example
- `GET /api/v1/examples/realtime-demo` - Real-time subscriptions demo

## Authentication

All routes except `/health` require Clerk JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <clerk-jwt-token>
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Rate Limiting

- Production: 100 requests per 15 minutes per IP
- Development: 1000 requests per 15 minutes per IP

## Security Features

- Helmet.js for security headers
- CORS configuration
- Request rate limiting
- Input validation with express-validator
- JWT token validation

## Example Usage

### Upload and Process File with Vector Storage

```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileBlob);

const uploadResponse = await fetch('/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  },
  body: formData
});

// Store vector representation
const vectorResponse = await fetch('/api/v1/vectors/upsert', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vectors: [{
      id: 'file-123',
      values: embeddings, // Your embeddings array
      metadata: {
        filename: 'document.pdf',
        fileKey: uploadResponse.data.key
      }
    }]
  })
});
```

### Semantic Search

```javascript
const searchResponse = await fetch('/api/v1/vectors/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vector: queryEmbedding,
    topK: 10,
    includeMetadata: true,
    filter: {
      type: 'document'
    }
  })
});
```

## License

ISC