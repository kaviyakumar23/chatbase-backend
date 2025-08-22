# Chatbase Backend API

A production-ready backend API for a chatbase/chatbot platform built with Express.js, Prisma, Supabase, Cloudflare R2, and Pinecone.

## 🚀 Features

### Complete API Implementation
- **27 API endpoints** covering all major functionality
- **Authentication** with Clerk webhooks and user management
- **Agent Management** with full CRUD operations
- **Source Management** supporting files, websites, and text
- **Chat/Conversation** handling with session management
- **Lead Capture** and export functionality
- **Deploy Settings** and integration management
- **Public Widget APIs** for external usage
- **Usage/Billing** tracking and analytics

### Tech Stack
- **Framework**: Express.js with ES6 modules
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **File Storage**: Cloudflare R2
- **Vector Database**: Pinecone
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 API Endpoints

### Authentication APIs
- `POST /api/v1/auth/webhook` - Clerk webhook handler
- `GET /api/v1/auth/me` - Get current user info

### Agent Management APIs
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents/:id` - Get agent details
- `PUT /api/v1/agents/:id` - Update agent
- `DELETE /api/v1/agents/:id` - Delete agent

### Source Management APIs
- `GET /api/v1/agents/:agentId/sources` - List agent sources
- `POST /api/v1/agents/:agentId/sources/file` - Upload file source
- `POST /api/v1/agents/:agentId/sources/website` - Add website source
- `POST /api/v1/agents/:agentId/sources/text` - Add text source
- `DELETE /api/v1/agents/:agentId/sources/:sourceId` - Delete source
- `POST /api/v1/agents/:agentId/sources/:sourceId/reprocess` - Reprocess source

### Chat/Conversation APIs
- `POST /api/v1/agents/:agentId/chat` - Send message to agent
- `GET /api/v1/agents/:agentId/chat-logs` - Get chat logs
- `GET /api/v1/agents/:agentId/chat-logs/:sessionId` - Get specific session

### Lead Management APIs
- `GET /api/v1/agents/:agentId/leads` - List captured leads
- `PUT /api/v1/agents/:agentId/leads/:leadId` - Update lead status
- `POST /api/v1/agents/:agentId/leads/export` - Export leads to CSV

### Deploy/Integration APIs
- `GET /api/v1/agents/:agentId/deploy-settings` - Get widget settings
- `PUT /api/v1/agents/:agentId/deploy-settings` - Update widget settings
- `GET /api/v1/agents/:agentId/integrations` - Get integration info
- `PUT /api/v1/agents/:agentId/integrations` - Update integrations

### Public Widget APIs (No auth required)
- `GET /api/v1/public/agents/:publicId/config` - Get public agent config
- `POST /api/v1/public/agents/:publicId/chat` - Send message via widget
- `POST /api/v1/public/agents/:publicId/lead` - Capture lead via widget

### Usage/Billing APIs
- `GET /api/v1/usage` - Get usage statistics and billing info

## 🛠 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Clerk account for authentication
- Cloudflare R2 for file storage
- Pinecone for vector storage

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd chatbase-backend
npm install
```

2. **Environment Configuration**
Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Supabase)
DATABASE_URL=your_postgresql_connection_string

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_cloudflare_access_key_id
CLOUDFLARE_SECRET_ACCESS_KEY=your_cloudflare_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT=your_r2_endpoint

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_pinecone_index_name

# URLs for widget and sharing
BASE_URL=https://api.yourapp.com
WIDGET_URL=https://widget.yourapp.com
SHARE_URL=https://chat.yourapp.com
```

3. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) View database in Prisma Studio
npx prisma studio
```

4. **Start Development Server**
```bash
npm run dev
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Comprehensive Testing
See `test-apis.md` for detailed curl examples for all 27 endpoints.

### Test Scripts
```bash
npm run test-setup    # Test basic setup
npm run test-keys     # Test API keys
npm run test-prisma   # Test database connection
```

## 📁 Project Structure

```
chatbase-backend/
├── controllers/          # API logic
│   ├── authController.js
│   ├── agentController.js
│   ├── sourceController.js
│   ├── chatController.js
│   ├── leadsController.js
│   ├── deployController.js
│   ├── publicController.js
│   └── usageController.js
├── routes/              # Route definitions
│   ├── auth.js
│   ├── agents.js
│   ├── sources.js
│   ├── chat.js
│   ├── leads.js
│   ├── deploy.js
│   ├── public.js
│   ├── usage.js
│   └── index.js
├── middleware/          # Custom middleware
│   ├── auth.js         # Authentication
│   ├── validation.js   # Input validation
│   └── errorHandler.js # Error handling
├── services/           # External service integrations
│   ├── storageService.js   # Cloudflare R2
│   ├── vectorService.js    # Pinecone
│   ├── prismaService.js    # Database
│   └── supabaseService.js  # Supabase
├── config/             # Configuration files
├── prisma/            # Database schema and migrations
├── utils/             # Utility functions
└── generated/         # Generated Prisma client
```

## 🔒 Security Features

- **Authentication**: Clerk JWT token validation
- **Rate Limiting**: Configurable rate limits for public endpoints
- **Input Validation**: Comprehensive validation for all endpoints
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers
- **Domain Restrictions**: Configurable allowed domains for widgets

## 🔄 Data Flow

### Agent Creation Flow
1. User creates agent via API
2. Unique identifiers generated (slug, publicId, vectorNamespace)
3. Default deploy settings created
4. Agent stored in database

### Source Processing Flow
1. File uploaded to Cloudflare R2
2. Source record created in database
3. Background job processes content (TODO: implement)
4. Text extracted, chunked, and embedded
5. Vectors stored in Pinecone with metadata

### Chat Flow
1. Message received via public or authenticated endpoint
2. Vector search for relevant context
3. LLM generates response with context
4. Message and response stored in database
5. Usage statistics updated

## 📊 Database Schema

### Key Models
- **User**: Clerk user with plan limits
- **Agent**: Chatbot configuration and settings
- **DataSource**: File, website, or text sources
- **Conversation**: Chat sessions with metadata
- **Message**: Individual messages in conversations
- **CapturedLead**: Lead information from conversations
- **UsageTracking**: Monthly usage statistics

## 🚢 Production Deployment

### Environment Variables
Set all required environment variables for production services.

### Database Migrations
```bash
npx prisma migrate deploy
```

### Process Management
Use PM2, Docker, or similar for process management in production.

### Monitoring
- Health check endpoint: `/api/v1/health`
- Usage tracking built-in
- Error logging with Winston

## 📚 API Documentation

- **OpenAPI/Swagger**: Coming soon
- **Postman Collection**: Available on request
- **Testing Guide**: See `test-apis.md`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Support

- Check `test-apis.md` for API examples
- Review environment configuration
- Ensure all external services are properly configured
- Check logs for detailed error information

---

**Note**: This is a complete API implementation with 27 endpoints covering all major chatbase functionality. The chat AI responses currently return placeholder content - integrate with OpenAI API for actual AI responses.