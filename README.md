# SIA RTW Member Forum Portal

A secure web portal for SIA Safety Division members to collaborate on Return to Work (RTW) coordination, access AI-powered assistance, and escalate complex cases to experts.

## Features

### 🔐 Secure Member Portal
- Password-protected access for SD members
- Role-based permissions (Member, RTW Liaison, Legal Counsel, Admin)
- Audit logging for compliance
- Session management and timeout

### 💬 Discussion Forum
- Post questions about temporary and permanent work restrictions
- Categorized discussions (Industrial, Non-Industrial, ADA/FEHA, Bridge Assignments)
- Reply threading and conversation management
- Mark posts as resolved
- Private post option for sensitive cases
- Search and filter capabilities

### 🤖 AI Chatbot Assistant
- Powered by Anthropic Claude AI
- Trained on:
  - ADA/FEHA compliance materials
  - Q&A emails with legal counsel
  - Job descriptions database
  - Bridge assignment templates
  - Approved forum posts
- Context-aware responses with source citations
- Conversation history tracking

### 📤 Escalation System
- Escalate complex cases to RTW Liaison or Legal Counsel
- Priority levels (Low, Medium, High, Urgent)
- Email notifications
- SLA tracking
- Resolution management

### 👥 User Management
- Add/remove SD members
- Manage roles and permissions
- Track user activity
- Bulk import from CSV

### 📊 Admin Dashboard
- Content moderation
- Chatbot training management
- Analytics and reporting
- System configuration

## Technology Stack

- **Frontend**: Next.js 14 (React), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: Anthropic Claude API
- **Email**: Nodemailer with SMTP
- **Deployment**: Vercel, Docker, or traditional server

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Anthropic API key

### Installation

```bash
# Clone repository
git clone <repo-url>
cd sia-rtw-portal-claude

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` and login with:
- Email: `admin@sia-jpa.org`
- Password: `admin123` (**change immediately**)

## Documentation

- **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** - Detailed setup and deployment instructions
- **[Architecture](ARCHITECTURE.md)** - Technical architecture and design decisions
- **API Documentation** - Coming soon
- **User Guide** - Coming soon

## Project Structure

```
sia-rtw-portal-claude/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API routes
│   │   ├── login/          # Login page
│   │   ├── dashboard/      # Main dashboard
│   │   └── ...
│   ├── components/         # React components
│   ├── lib/                # Utility functions and services
│   │   ├── prisma.ts       # Database client
│   │   ├── auth.ts         # Authentication config
│   │   ├── chatbot.ts      # AI chatbot service
│   │   └── email.ts        # Email service
│   └── types/              # TypeScript type definitions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Initial data
├── public/                 # Static assets
└── docs/                   # Additional documentation

```

## Environment Variables

Key environment variables needed:

```env
DATABASE_URL=              # PostgreSQL connection string
NEXTAUTH_SECRET=           # Authentication secret
ANTHROPIC_API_KEY=         # Claude AI API key
SMTP_HOST=                 # Email server
SMTP_USER=                 # Email username
SMTP_PASSWORD=             # Email password
```

See `.env.example` for complete list.

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker
```bash
docker build -t sia-rtw-portal .
docker run -p 3000:3000 --env-file .env sia-rtw-portal
```

### Traditional Server
See [Implementation Guide](IMPLEMENTATION_GUIDE.md) for detailed instructions.

## Security

- All passwords hashed with bcrypt
- HTTPS enforcement
- Rate limiting on API endpoints
- SQL injection protection via Prisma
- XSS protection
- CSRF protection
- Audit logging
- Session security

## Support

For technical questions or issues:
1. Check the [Implementation Guide](IMPLEMENTATION_GUIDE.md)
2. Review the [Architecture documentation](ARCHITECTURE.md)
3. Contact your IT administrator

## License

Proprietary - State Insurance Authority

## Acknowledgments

Built with:
- Next.js
- Prisma
- Anthropic Claude AI
- NextAuth.js
- Tailwind CSS