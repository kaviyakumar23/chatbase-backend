# API Testing Guide

This document provides curl examples for testing all the chatbase APIs.

## Setup

1. Start the server: `npm run dev`
2. Set up environment variables in `.env`
3. Replace `{token}` with actual Clerk JWT token
4. Replace `{agent_id}`, `{public_id}`, etc. with actual UUIDs

## Authentication APIs

### 1. Clerk Webhook (POST /api/v1/auth/webhook)
```bash
curl -X POST http://localhost:3000/api/v1/auth/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user.created",
    "data": {
      "id": "user_test123",
      "email_addresses": [{"email_address": "test@example.com"}],
      "first_name": "John",
      "last_name": "Doe"
    }
  }'
```

### 2. Get Current User (GET /api/v1/auth/me)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer {token}"
```

## Agent Management APIs

### 3. Get Agents (GET /api/v1/agents)
```bash
curl -X GET http://localhost:3000/api/v1/agents \
  -H "Authorization: Bearer {token}"
```

### 4. Create Agent (POST /api/v1/agents)
```bash
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Bot",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "system_prompt": "You are a helpful customer support assistant..."
  }'
```

### 5. Get Agent (GET /api/v1/agents/{id})
```bash
curl -X GET http://localhost:3000/api/v1/agents/{agent_id} \
  -H "Authorization: Bearer {token}"
```

### 6. Update Agent (PUT /api/v1/agents/{id})
```bash
curl -X PUT http://localhost:3000/api/v1/agents/{agent_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Bot Name",
    "status": "published"
  }'
```

### 7. Delete Agent (DELETE /api/v1/agents/{id})
```bash
curl -X DELETE http://localhost:3000/api/v1/agents/{agent_id} \
  -H "Authorization: Bearer {token}"
```

## Source Management APIs

### 8. Get Sources (GET /api/v1/agents/{agentId}/sources)
```bash
curl -X GET http://localhost:3000/api/v1/agents/{agent_id}/sources \
  -H "Authorization: Bearer {token}"
```

### 9. Upload File Source (POST /api/v1/agents/{agentId}/sources/file)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/sources/file \
  -H "Authorization: Bearer {token}" \
  -F "file=@./test-document.pdf" \
  -F "name=Product Manual"
```

### 10. Create Website Source (POST /api/v1/agents/{agentId}/sources/website)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/sources/website \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "crawl_subpages": true,
    "max_pages": 10
  }'
```

### 11. Create Text Source (POST /api/v1/agents/{agentId}/sources/text)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/sources/text \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FAQ Content",
    "content": "Q: What is your return policy?\nA: We offer 30-day returns..."
  }'
```

### 12. Delete Source (DELETE /api/v1/agents/{agentId}/sources/{sourceId})
```bash
curl -X DELETE http://localhost:3000/api/v1/agents/{agent_id}/sources/{source_id} \
  -H "Authorization: Bearer {token}"
```

### 13. Reprocess Source (POST /api/v1/agents/{agentId}/sources/{sourceId}/reprocess)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/sources/{source_id}/reprocess \
  -H "Authorization: Bearer {token}"
```

## Chat/Conversation APIs

### 14. Send Message (POST /api/v1/agents/{agentId}/chat)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is your return policy?",
    "session_id": "sess_abc123",
    "context": {
      "user_email": "customer@example.com",
      "user_name": "John Doe"
    }
  }'
```

### 15. Get Chat Logs (GET /api/v1/agents/{agentId}/chat-logs)
```bash
curl -X GET "http://localhost:3000/api/v1/agents/{agent_id}/chat-logs?page=1&limit=20&start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer {token}"
```

### 16. Get Chat Session (GET /api/v1/agents/{agentId}/chat-logs/{sessionId})
```bash
curl -X GET http://localhost:3000/api/v1/agents/{agent_id}/chat-logs/{session_id} \
  -H "Authorization: Bearer {token}"
```

## Leads APIs

### 17. Get Leads (GET /api/v1/agents/{agentId}/leads)
```bash
curl -X GET "http://localhost:3000/api/v1/agents/{agent_id}/leads?page=1&limit=20&exported=false" \
  -H "Authorization: Bearer {token}"
```

### 18. Update Lead (PUT /api/v1/agents/{agentId}/leads/{leadId})
```bash
curl -X PUT http://localhost:3000/api/v1/agents/{agent_id}/leads/{lead_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exported": true
  }'
```

### 19. Export Leads (POST /api/v1/agents/{agentId}/leads/export)
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent_id}/leads/export \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }'
```

## Deploy/Integration APIs

### 20. Get Deploy Settings (GET /api/v1/agents/{agentId}/deploy-settings)
```bash
curl -X GET http://localhost:3000/api/v1/agents/{agent_id}/deploy-settings \
  -H "Authorization: Bearer {token}"
```

### 21. Update Deploy Settings (PUT /api/v1/agents/{agentId}/deploy-settings)
```bash
curl -X PUT http://localhost:3000/api/v1/agents/{agent_id}/deploy-settings \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "initial_message": "Welcome! How can I assist?",
    "theme": "dark",
    "bubble_color": "#0066FF",
    "collect_user_info": true
  }'
```

### 22. Get Integrations (GET /api/v1/agents/{agentId}/integrations)
```bash
curl -X GET http://localhost:3000/api/v1/agents/{agent_id}/integrations \
  -H "Authorization: Bearer {token}"
```

### 23. Update Integrations (PUT /api/v1/agents/{agentId}/integrations)
```bash
curl -X PUT http://localhost:3000/api/v1/agents/{agent_id}/integrations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_domains": ["example.com", "app.example.com"],
    "share_enabled": true
  }'
```

## Public/Widget APIs (No auth required)

### 24. Get Agent Config (GET /api/v1/public/agents/{publicId}/config)
```bash
curl -X GET http://localhost:3000/api/v1/public/agents/{public_id}/config
```

### 25. Send Public Message (POST /api/v1/public/agents/{publicId}/chat)
```bash
curl -X POST http://localhost:3000/api/v1/public/agents/{public_id}/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your prices?",
    "session_id": "sess_visitor_123"
  }'
```

### 26. Capture Public Lead (POST /api/v1/public/agents/{publicId}/lead)
```bash
curl -X POST http://localhost:3000/api/v1/public/agents/{public_id}/lead \
  -H "Content-Type: application/json" \
  -d '{
    "email": "visitor@example.com",
    "name": "John Visitor",
    "session_id": "sess_visitor_123"
  }'
```

## Usage/Billing APIs

### 27. Get Usage (GET /api/v1/usage)
```bash
curl -X GET http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer {token}"
```

## Testing Health Check

### Health Check (GET /api/v1/health)
```bash
curl -X GET http://localhost:3000/api/v1/health
```

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## Testing Notes

1. **Authentication**: Most endpoints require a valid Clerk JWT token in the Authorization header
2. **Rate Limiting**: Public endpoints have rate limiting applied
3. **File Uploads**: Use `-F` for multipart form data when uploading files
4. **UUID Format**: All IDs should be valid UUIDs
5. **Validation**: All endpoints have input validation - check error messages for details

## Environment Setup for Testing

Make sure your `.env` file has proper values for:
- `DATABASE_URL` (for database operations)
- `CLERK_SECRET_KEY` (for authentication)
- `CLOUDFLARE_*` (for file uploads)
- `PINECONE_*` (for vector operations)

Note: Some endpoints may return placeholder responses or errors if external services (Clerk, R2, Pinecone) are not properly configured.