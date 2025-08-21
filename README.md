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
- `GET /api/v1/health` - Server status and uptime information

## Testing API Keys

To verify that all your API keys are working correctly, run:

```bash
npm run test-keys
```

This will test connections to:
- **Supabase** - Database connection and authentication
- **Cloudflare R2** - Object storage connection
- **Pinecone** - Vector database connection
- **Clerk** - Authentication service connection

## Authentication

Currently, only the health endpoint is available and does not require authentication. When you add more endpoints, you can configure Clerk JWT authentication by including the token in the Authorization header:

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



## License

ISC