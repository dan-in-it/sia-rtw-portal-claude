# Chatbot Training and Feedback Loop Guide

## Overview

The SIA RTW Portal includes an AI-powered chatbot that can learn from forum discussions, creating a continuous improvement cycle. This document explains how the chatbot training and feedback loop works.

## How It Works

### 1. Initial Training Data Sources

The chatbot is initially trained on:

- **ADA/FEHA Compliance Materials**: Legal guidelines and regulations
- **Historical Q&A Emails**: Past correspondence with legal counsel
- **Job Descriptions**: Database of positions and requirements
- **Bridge Assignments**: Templates and examples of temporary assignments
- **Approved Forum Posts**: High-quality discussions from the member forum

### 2. Chatbot Response Generation

When a user asks a question:

```
User Question
    ↓
Search Knowledge Base (Vector Database)
    ↓
Retrieve Relevant Documents
    ↓
Send to Claude AI with Context
    ↓
Generate Response with Citations
    ↓
Display to User
```

The chatbot uses **RAG (Retrieval-Augmented Generation)**:
- Searches the knowledge base for relevant information
- Provides that context to the AI model
- AI generates a response based on the specific documents
- Response includes citations to source materials

## Forum Post to Training Data Pipeline

### Automatic Pipeline (Recommended)

**Yes, forum posts can automatically feed back into chatbot training!**

Here's how the feedback loop works:

```
Forum Post Created
    ↓
Community Discussion & Replies
    ↓
Post Marked as Helpful/Resolved
    ↓
Admin Reviews Post
    ↓
Admin Approves for Training
    ↓
Automatic Processing:
  - Generate Text Embeddings
  - Store in Vector Database
  - Add to Training Documents
    ↓
Chatbot Uses in Future Responses
```

### Manual Pipeline (Alternative)

Admins can manually:
1. Review forum posts
2. Export high-quality Q&A pairs
3. Upload as training documents
4. Chatbot incorporates them

## Implementation Details

### Database Schema Support

The system is designed with this feedback loop in mind:

```typescript
// posts table
approvedForTraining: Boolean  // Admin marks post as training-worthy

// training_documents table
sourcePostId: UUID            // Links back to original post
documentType: 'FORUM_POST'    // Identifies source as forum
```

### Approval Workflow

1. **Post Creation**: User creates a post with a question
2. **Community Response**: Other members, RTW Liaison, or Legal Counsel respond
3. **Resolution**: Post marked as resolved
4. **Admin Review**: Admin reviews helpful/resolved posts
5. **Approval**: Admin clicks "Approve for Training"
6. **Automatic Processing**:
   - System extracts question and answer
   - Generates embeddings for semantic search
   - Adds to vector database
   - Links to original post for citation

### Code Implementation

In `src/app/api/posts/[id]/route.ts`:

```typescript
// When admin approves post for training
if (validatedData.approvedForTraining) {
  // Extract content
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { replies: true },
  });

  // Create training document
  await prisma.trainingDocument.create({
    data: {
      title: post.title,
      content: formatPostForTraining(post),
      documentType: 'FORUM_POST',
      sourcePostId: post.id,
      uploadedById: session.user.id,
    },
  });

  // Generate embeddings and store in vector DB
  await addToVectorDatabase(post);
}
```

## Regular Update Schedule

### Automated Daily Process

Set up a cron job or scheduled task:

```bash
# Daily at 2 AM
0 2 * * * /path/to/scripts/update-training-data.sh
```

The script:
1. Finds newly approved posts from last 24 hours
2. Generates embeddings
3. Updates vector database
4. Logs results

### Weekly Admin Review

Every week, admins should:
1. Review resolved posts
2. Identify high-quality discussions
3. Approve for training
4. Monitor chatbot performance

## Quality Control

### Approval Criteria

Posts should be approved for training if they:

- ✅ Contain accurate information
- ✅ Are answered by authorized personnel (RTW Liaison, Legal Counsel)
- ✅ Address common scenarios
- ✅ Provide clear, actionable guidance
- ✅ Include proper citations to regulations
- ✅ Are well-written and clear

Posts should NOT be approved if they:

- ❌ Contain incorrect information
- ❌ Are still under debate
- ❌ Include sensitive personal information
- ❌ Are poorly written or unclear
- ❌ Contradict established policies
- ❌ Lack authoritative response

### Review Process

```
Weekly Review Meeting
    ↓
Admins Review Resolved Posts
    ↓
Evaluate Quality & Accuracy
    ↓
Approve/Reject for Training
    ↓
System Auto-Processes Approved Posts
```

## Vector Database Integration

### What is a Vector Database?

A vector database stores "embeddings" - numerical representations of text that capture semantic meaning. This allows the chatbot to find relevant information even if exact words don't match.

Example:
- User asks: "Can I modify an employee's schedule due to injury?"
- System finds: Document about "reasonable accommodations for medical restrictions"
- Even though exact words differ, semantic meaning matches

### Recommended Options

#### Option 1: Pinecone (Easiest)
```javascript
// Install
npm install @pinecone-database/pinecone

// Configure
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Add document
await pinecone.upsert({
  id: post.id,
  values: embeddings,
  metadata: {
    title: post.title,
    content: post.content,
    type: 'forum_post',
  },
});
```

#### Option 2: PostgreSQL pgvector (Integrated)
```sql
-- Enable extension
CREATE EXTENSION vector;

-- Add to existing table
ALTER TABLE training_documents
ADD COLUMN embedding vector(1536);

-- Search
SELECT * FROM training_documents
ORDER BY embedding <-> query_embedding
LIMIT 5;
```

## Monitoring Training Effectiveness

### Metrics to Track

1. **Coverage**: % of user questions answered confidently
2. **Accuracy**: User feedback on response quality
3. **Citation Rate**: How often chatbot cites forum posts
4. **Escalation Rate**: How often users need human help

### Dashboard (Admin Panel)

```
Chatbot Training Analytics
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Training Documents
   - Total: 1,247
   - Forum Posts: 342
   - Compliance Docs: 89
   - Q&A Emails: 816

📈 Response Quality
   - Helpful: 87%
   - Neutral: 11%
   - Not Helpful: 2%

🎯 Coverage
   - Answered: 78%
   - Escalated: 22%

📚 Top Cited Posts
   1. "Temporary light duty restrictions" (45 citations)
   2. "ADA interactive process timeline" (38 citations)
   3. "Bridge assignment duration limits" (29 citations)
```

## Privacy and Compliance

### Before Approving Posts for Training

- [ ] Remove any personally identifiable information (PII)
- [ ] Remove employee names, IDs, or identifying details
- [ ] Generalize specific medical conditions if necessary
- [ ] Ensure no HIPAA violations
- [ ] Verify information accuracy with legal/RTW liaison

### Automatic PII Scrubbing

Consider implementing automatic PII detection:

```typescript
function sanitizeForTraining(content: string): string {
  // Remove names
  content = content.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[Name]');

  // Remove email addresses
  content = content.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[Email]');

  // Remove phone numbers
  content = content.replace(/\d{3}[-.]?\d{3}[-.]?\d{4}/g, '[Phone]');

  // Remove employee IDs
  content = content.replace(/\bEMP\d+\b/g, '[Employee ID]');

  return content;
}
```

## Versioning and Rollback

### Training Data Versions

Maintain versions of training data:

```
Version 1.0 - Initial deployment
Version 1.1 - Added 50 forum posts
Version 1.2 - Added updated ADA guidelines
```

### Rollback Capability

If chatbot quality degrades:
1. Identify problematic training data
2. Remove from vector database
3. Revert to previous version
4. Re-test chatbot responses

## Best Practices

### For Admins

1. **Review Weekly**: Don't let approved posts pile up
2. **Quality over Quantity**: Better to have 10 excellent examples than 100 mediocre ones
3. **Diverse Topics**: Ensure all categories are represented
4. **Update Regularly**: Keep training data current with policy changes
5. **Monitor Performance**: Track chatbot effectiveness metrics

### For RTW Liaisons and Legal Counsel

1. **Mark Your Responses**: Indicate which responses are authoritative
2. **Cite Sources**: Reference specific regulations or policies
3. **Be Clear**: Write responses suitable for training
4. **Flag Outdated Info**: Notify admins when policies change

### For SD Members

1. **Provide Feedback**: Rate chatbot responses (helpful/not helpful)
2. **Escalate When Needed**: Don't rely solely on chatbot for complex cases
3. **Search First**: Check if your question was already answered
4. **Mark Resolved**: Help identify high-quality discussions

## Continuous Improvement Cycle

```
┌─────────────────────────────────────┐
│ 1. User asks chatbot question      │
│    ↓ If not satisfied               │
│ 2. User creates forum post          │
│    ↓                                 │
│ 3. Expert provides answer           │
│    ↓                                 │
│ 4. Post marked as helpful/resolved  │
│    ↓                                 │
│ 5. Admin approves for training      │
│    ↓                                 │
│ 6. Added to chatbot knowledge base  │
│    ↓                                 │
│ 7. Future users get better answers  │
└─────────────────────────────────────┘
```

## FAQ

### Q: How often should we update chatbot training?

**A**: Ideally, approve posts for training weekly. The system can process them automatically, so there's minimal overhead.

### Q: Will the chatbot cite its sources?

**A**: Yes! The chatbot includes citations showing which documents it used to generate responses. Forum posts will be cited as sources.

### Q: What if a trained post later turns out to be incorrect?

**A**: Admins can deactivate training documents at any time. Set `isActive: false` and the chatbot will stop using it.

### Q: Can we prioritize certain types of posts?

**A**: Yes! You can implement a priority/weight system in the vector database to make certain sources more likely to be retrieved.

### Q: How long does it take for an approved post to be available to the chatbot?

**A**: With automatic processing, it can be immediate. With batch processing, typically within 24 hours.

### Q: Does this work with the escalation system?

**A**: Yes! When a user escalates, they can optionally allow the resolution to be added to training data (with PII removed).

## Technical Implementation Roadmap

### Phase 1: Basic Implementation (Weeks 1-2)
- [x] Database schema supports training feedback
- [x] Admin approval workflow
- [x] Basic chatbot with RAG

### Phase 2: Vector Database (Weeks 3-4)
- [ ] Choose vector DB (Pinecone or pgvector)
- [ ] Implement embedding generation
- [ ] Connect to chatbot search

### Phase 3: Automation (Weeks 5-6)
- [ ] Automatic post processing
- [ ] Scheduled batch updates
- [ ] PII scrubbing

### Phase 4: Analytics (Weeks 7-8)
- [ ] Training effectiveness dashboard
- [ ] Citation tracking
- [ ] Quality metrics

## Conclusion

The chatbot training feedback loop creates a **self-improving system**:

1. ✅ **Real-world questions** from SD members
2. ✅ **Expert answers** from RTW Liaison and Legal Counsel
3. ✅ **Automatic learning** from approved discussions
4. ✅ **Better responses** for future users

This ensures the chatbot becomes **more valuable over time**, learning from your organization's specific scenarios and expertise.

---

**Next Steps**:
1. Review the implementation in `src/lib/chatbot.ts`
2. Set up vector database (see IMPLEMENTATION_GUIDE.md)
3. Train admins on approval workflow
4. Start small with 10-20 carefully selected posts
5. Monitor effectiveness and iterate
