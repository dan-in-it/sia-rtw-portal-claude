# AI Chatbot Setup Guide

This guide explains how to configure and use the AI chatbot powered by Anthropic's Claude API.

## Prerequisites

1. **Anthropic API Account**: Sign up at [https://console.anthropic.com](https://console.anthropic.com)
2. **API Key**: Generate an API key from the Anthropic console
3. **Database**: PostgreSQL with training documents seeded

## Configuration

### 1. Set Environment Variable

Add your Anthropic API key to the `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
```

### 2. Verify Configuration

When the server starts, you should see:
- ✅ No warning messages about missing API key
- ❌ If you see: `⚠️ WARNING: ANTHROPIC_API_KEY is not set`, check your `.env` file

## How the Chatbot Works

### Architecture

The chatbot uses **RAG (Retrieval-Augmented Generation)** architecture:

```
User Question
    ↓
1. Search Knowledge Base (keyword-based)
    ↓
2. Retrieve Top 5 Relevant Documents
    ↓
3. Build Context from Documents
    ↓
4. Send to Claude API with Context
    ↓
5. Return Response with Source Citations
```

### Knowledge Base Search

The chatbot searches training documents using:
- **Keyword extraction**: Removes stop words, extracts meaningful terms
- **Multi-field search**: Searches both title and content
- **Relevance scoring**: Ranks documents by keyword matches
- **Content limiting**: Limits document length to 1500 characters to optimize token usage

### Claude API Integration

- **Model**: `claude-3-5-sonnet-20241022` (latest Sonnet model)
- **Max tokens**: 2048 per response
- **Context**: Last 10 messages + retrieved documents
- **System prompt**: Specialized for RTW, ADA/FEHA compliance
- **Error handling**: Graceful fallbacks for API errors

## Training the Chatbot

### 1. Add Training Documents

Documents are stored in the `training_documents` table and can be added via:

#### Via Admin Panel (Recommended)
1. Login as admin
2. Navigate to Admin → Chatbot Training
3. Upload documents (PDFs, text files)
4. System automatically processes and activates them

#### Via Database Seed
The seed script creates sample documents. You can add more:

```typescript
await prisma.trainingDocument.create({
  data: {
    title: 'Document Title',
    content: 'Full document content...',
    documentType: 'COMPLIANCE', // or 'QA', 'JOB_DESC', 'BRIDGE', 'FORUM_POST'
    uploadedById: adminUserId,
    isActive: true,
  },
});
```

### 2. Document Types

| Type | Description | Example |
|------|-------------|---------|
| `COMPLIANCE` | ADA/FEHA regulations | ADA Reasonable Accommodation Guidelines |
| `QA` | Q&A with legal counsel | Historical legal questions and answers |
| `JOB_DESC` | Job descriptions | Job classification documents |
| `BRIDGE` | Bridge assignments | Temporary assignment templates |
| `FORUM_POST` | Approved posts | High-quality forum discussions |

### 3. Best Practices for Training Documents

✅ **DO**:
- Keep documents focused on specific topics
- Include clear titles that describe the content
- Use consistent terminology (ADA, FEHA, RTW, etc.)
- Update documents when regulations change
- Mark outdated documents as inactive

❌ **DON'T**:
- Include personal identifying information (PII)
- Upload extremely large documents (>10,000 words)
- Duplicate content across multiple documents
- Leave documents untitled

## Features

### Conversation Management

- **Auto-save**: Conversations are automatically saved to database
- **History**: Users can view and resume past conversations
- **Context**: Chatbot remembers last 10 messages in conversation
- **Multi-user**: Each user has their own conversation history

### Source Citations

When the chatbot responds, it includes:
- **Source documents**: Lists which documents were used
- **Document type**: Shows whether from compliance, Q&A, etc.
- **Relevance**: Documents ranked by relevance score

### Rate Limiting

- **Limit**: 30 messages per minute per user
- **Purpose**: Prevent API abuse and control costs
- **Response**: Returns 429 error if limit exceeded

## API Endpoints

### Send Message
```
POST /api/chatbot/message
{
  "conversationId": "uuid" (optional),
  "message": "string"
}
```

### List Conversations
```
GET /api/chatbot/conversations
```

### Get Conversation
```
GET /api/chatbot/conversations/:id
```

### Delete Conversation
```
DELETE /api/chatbot/conversations/:id
```

## Error Handling

The chatbot handles various error scenarios:

| Error | User Message | Action |
|-------|-------------|--------|
| No API key | "Chatbot is not configured..." | Contact administrator |
| Invalid API key | "Invalid API key..." | Contact administrator |
| Rate limit (API) | "API rate limit reached..." | Wait and retry |
| Rate limit (app) | "Too many requests..." | Wait 1 minute |
| API unavailable | "Claude API is temporarily unavailable..." | Try again later |
| Network error | "Failed to generate response..." | Retry |

## Cost Management

### Token Usage

Each conversation uses tokens for:
- **System prompt**: ~300 tokens (RTW instructions + context)
- **Retrieved documents**: Up to ~1500 tokens per document × 5
- **Conversation history**: ~100-200 tokens per message × 10
- **User message**: Variable
- **Response**: Up to 2048 tokens

**Estimated cost per message**: $0.003 - $0.01 USD

### Optimization Tips

1. **Limit document content**: Already limited to 1500 chars
2. **Reduce history**: Currently set to last 10 messages
3. **Smart caching**: Use conversation history efficiently
4. **Monitor usage**: Track API costs in Anthropic console

## Upgrading to Vector Search

For production environments, consider implementing vector similarity search:

### Option 1: Pinecone

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Generate embeddings and store
// Query for similar documents
```

### Option 2: pgvector (PostgreSQL Extension)

```sql
CREATE EXTENSION vector;

ALTER TABLE training_documents
ADD COLUMN embedding vector(1536);

-- Query with vector similarity
SELECT * FROM training_documents
ORDER BY embedding <-> $1
LIMIT 5;
```

## Troubleshooting

### Chatbot not responding

1. Check API key is set in `.env`
2. Verify API key is valid in Anthropic console
3. Check server logs for errors
4. Test API key with curl:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

### No relevant documents found

1. Verify training documents are seeded: `npm run db:seed`
2. Check documents are marked as `isActive: true`
3. Add more training documents relevant to common queries
4. Review keyword extraction (may need to adjust stop words)

### High API costs

1. Review token usage in Anthropic console
2. Reduce `max_tokens` from 2048 to 1024
3. Limit conversation history from 10 to 5 messages
4. Reduce document content limit from 1500 to 1000 characters
5. Implement caching for common questions

## Support

- **Anthropic Documentation**: https://docs.anthropic.com
- **API Status**: https://status.anthropic.com
- **Rate Limits**: https://docs.anthropic.com/en/api/rate-limits

## Advanced Features (Future Enhancements)

1. **Streaming Responses**: Show response as it's generated
2. **Multi-language Support**: Support Spanish, other languages
3. **Voice Input**: Speech-to-text integration
4. **Suggested Questions**: Based on conversation context
5. **Feedback Loop**: Users rate responses, improve training
6. **Auto-tagging**: Automatically tag conversations by topic
7. **Export Conversations**: Download as PDF or text
8. **Admin Analytics**: Track usage patterns, common questions
