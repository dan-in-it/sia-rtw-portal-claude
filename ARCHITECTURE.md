# RTW Member Forum Portal - Technical Architecture

## Project Overview
Secure web portal for SIA SD members to discuss Return to Work (RTW) coordination, access AI chatbot assistance, and escalate to experts.

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React-based, with App Router)
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context API + SWR for data fetching
- **Rich Text Editor**: TipTap or React-Quill for post creation
- **Real-time Updates**: Socket.io client

### Backend
- **API**: Next.js API Routes (serverless functions)
- **Authentication**: NextAuth.js v5 with session management
- **Database**: PostgreSQL (via Supabase or direct connection)
- **ORM**: Prisma
- **File Storage**: S3-compatible storage for attachments
- **Email**: SendGrid or similar for notifications

### AI/Chatbot
- **AI Provider**: Anthropic Claude API (or OpenAI)
- **Vector Database**: Pinecone or PostgreSQL with pgvector extension
- **Embeddings**: For semantic search and RAG (Retrieval-Augmented Generation)
- **Training Pipeline**: Automated ingestion of forum posts into vector DB

### Infrastructure
- **Hosting**: Vercel (Next.js optimized) or AWS
- **Database**: Managed PostgreSQL (Supabase, Neon, or AWS RDS)
- **CDN**: Vercel Edge Network or CloudFront
- **Monitoring**: Sentry for error tracking

## Core Features

### 1. Authentication & Authorization
- **User Roles**:
  - SD Member (standard access)
  - RTW Liaison (can respond, escalate, moderate)
  - Legal Counsel (can respond to escalated items)
  - Admin (full control)

- **Login Methods**:
  - Email/Password (primary)
  - SSO integration (optional for future)
  - 2FA support (optional enhancement)

- **Access Control**:
  - Role-based permissions
  - Audit logging for compliance

### 2. Forum/Discussion Board
- **Features**:
  - Create posts/questions with categories:
    - Temporary Work Restrictions
    - Permanent Work Restrictions
    - Industrial Cases
    - Non-Industrial Cases
    - Bridge Assignments
    - ADA/FEHA Compliance
  - Reply to posts with threading
  - Upvote/helpful markers
  - Search and filter functionality
  - Tag posts for categorization
  - Mark posts as resolved
  - Private/public post options

- **Moderation**:
  - Admin approval workflow (optional)
  - Edit/delete capabilities
  - Flag inappropriate content

### 3. AI Chatbot
- **Capabilities**:
  - RAG-based responses using:
    - ADA/FEHA compliance materials
    - Historical Q&A with legal counsel
    - Job descriptions database
    - Bridge assignment templates
    - Approved forum posts
  - Conversation history per user
  - Citation of sources
  - "Escalate to human" option

- **Training Pipeline**:
  - Automated: New approved forum posts → embeddings → vector DB
  - Manual: Admin uploads new documents
  - Review queue for Q&A pairs before training
  - Version control for training data

### 4. Escalation System
- **Workflow**:
  1. User creates post or asks chatbot
  2. If needs expert help, clicks "Escalate"
  3. Escalation routed to:
     - RTW Liaison (for general RTW questions)
     - Legal Counsel (for compliance/legal questions)
  4. Expert receives email notification
  5. Expert responds in portal
  6. User gets notification of response
  7. Conversation tracked in escalation dashboard

- **SLA Tracking**:
  - Time to first response
  - Resolution time
  - Priority levels (Low/Medium/High/Urgent)

### 5. Admin Panel
- **User Management**:
  - Add/remove SD members
  - Manage roles and permissions
  - View user activity

- **Content Management**:
  - Moderate posts and replies
  - Approve/reject content
  - Manage categories and tags

- **Chatbot Management**:
  - Upload training documents
  - Review and approve forum posts for training
  - View chatbot analytics

- **Analytics**:
  - Forum engagement metrics
  - Chatbot usage statistics
  - Escalation reports
  - User activity reports

## Database Schema

### Tables

#### users
```sql
id: UUID (primary key)
email: VARCHAR (unique)
password_hash: VARCHAR
full_name: VARCHAR
role: ENUM ('member', 'liaison', 'legal', 'admin')
department: VARCHAR
created_at: TIMESTAMP
last_login: TIMESTAMP
is_active: BOOLEAN
```

#### posts
```sql
id: UUID (primary key)
author_id: UUID (foreign key → users)
category_id: UUID (foreign key → categories)
title: VARCHAR
content: TEXT
is_resolved: BOOLEAN
is_private: BOOLEAN
upvotes: INTEGER
view_count: INTEGER
created_at: TIMESTAMP
updated_at: TIMESTAMP
approved_for_training: BOOLEAN
```

#### replies
```sql
id: UUID (primary key)
post_id: UUID (foreign key → posts)
author_id: UUID (foreign key → users)
parent_reply_id: UUID (nullable, for threading)
content: TEXT
is_helpful: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### categories
```sql
id: UUID (primary key)
name: VARCHAR
description: TEXT
icon: VARCHAR
sort_order: INTEGER
```

#### escalations
```sql
id: UUID (primary key)
post_id: UUID (nullable, foreign key → posts)
requester_id: UUID (foreign key → users)
assigned_to: UUID (nullable, foreign key → users)
escalation_type: ENUM ('liaison', 'legal')
priority: ENUM ('low', 'medium', 'high', 'urgent')
status: ENUM ('open', 'in_progress', 'resolved', 'closed')
description: TEXT
created_at: TIMESTAMP
resolved_at: TIMESTAMP
```

#### chatbot_conversations
```sql
id: UUID (primary key)
user_id: UUID (foreign key → users)
created_at: TIMESTAMP
```

#### chatbot_messages
```sql
id: UUID (primary key)
conversation_id: UUID (foreign key → chatbot_conversations)
role: ENUM ('user', 'assistant')
content: TEXT
sources: JSONB (citations)
created_at: TIMESTAMP
```

#### training_documents
```sql
id: UUID (primary key)
title: VARCHAR
content: TEXT
document_type: ENUM ('compliance', 'qa', 'job_desc', 'bridge', 'forum_post')
source_post_id: UUID (nullable, foreign key → posts)
embeddings_id: VARCHAR (reference to vector DB)
uploaded_by: UUID (foreign key → users)
created_at: TIMESTAMP
is_active: BOOLEAN
```

## Security Considerations

1. **Authentication**:
   - Bcrypt password hashing
   - Secure session management
   - HTTPS only
   - Rate limiting on login attempts

2. **Authorization**:
   - Role-based access control (RBAC)
   - Row-level security in database
   - API endpoint protection

3. **Data Protection**:
   - Encryption at rest and in transit
   - PII handling compliance
   - Audit logging for sensitive actions
   - Regular security audits

4. **Compliance**:
   - HIPAA considerations (if health info shared)
   - Data retention policies
   - Export/delete user data (GDPR-style)

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up Next.js project structure
- Configure database and Prisma ORM
- Implement authentication system
- Create basic UI layout and navigation

### Phase 2: Forum Functionality (Weeks 3-4)
- Build post creation and viewing
- Implement reply system
- Add categories and search
- Create moderation tools

### Phase 3: Chatbot Integration (Weeks 5-6)
- Set up AI API integration
- Implement vector database
- Create chatbot UI
- Build RAG pipeline

### Phase 4: Escalation System (Week 7)
- Build escalation workflow
- Set up email notifications
- Create expert dashboard
- Implement SLA tracking

### Phase 5: Admin Panel & Training (Week 8)
- Build admin dashboard
- Create user management tools
- Implement training data pipeline
- Add analytics

### Phase 6: Testing & Deployment (Weeks 9-10)
- Security audit
- Performance testing
- User acceptance testing
- Deployment and documentation

## API Endpoints Structure

### Authentication
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/register` (admin only)
- GET `/api/auth/session`

### Posts
- GET `/api/posts` (list with filters)
- GET `/api/posts/:id`
- POST `/api/posts`
- PUT `/api/posts/:id`
- DELETE `/api/posts/:id`

### Replies
- GET `/api/posts/:id/replies`
- POST `/api/posts/:id/replies`
- PUT `/api/replies/:id`
- DELETE `/api/replies/:id`

### Chatbot
- POST `/api/chatbot/message`
- GET `/api/chatbot/conversations`
- GET `/api/chatbot/conversations/:id`

### Escalations
- POST `/api/escalations`
- GET `/api/escalations`
- PUT `/api/escalations/:id`

### Admin
- GET `/api/admin/users`
- POST `/api/admin/users`
- PUT `/api/admin/users/:id`
- GET `/api/admin/analytics`
- POST `/api/admin/training/upload`

## Environment Variables Needed
```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ANTHROPIC_API_KEY=
PINECONE_API_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

## Next Steps
1. Review and approve this architecture
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish deployment pipeline
