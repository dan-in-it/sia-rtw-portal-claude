# SIA RTW Portal - Implementation Guide

## Overview

This guide provides step-by-step instructions for setting up, configuring, and deploying the SIA RTW Member Forum Portal.

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm or yarn package manager
- Anthropic API key (for AI chatbot)
- SMTP server credentials (for email notifications)
- Domain name and SSL certificate (for production)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd sia-rtw-portal-claude

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### 2. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (if not already installed)
# On Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb sia_rtw_portal

# Create user
sudo -u postgres psql
CREATE USER sia_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sia_rtw_portal TO sia_admin;
\q
```

#### Option B: Cloud PostgreSQL (Recommended for Production)

Use a managed PostgreSQL service:
- **Supabase**: Free tier available, includes realtime features
- **Neon**: Serverless PostgreSQL with generous free tier
- **AWS RDS**: Enterprise-grade, fully managed
- **Google Cloud SQL**: Integrated with GCP services

### 3. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database - Update with your credentials
DATABASE_URL="postgresql://sia_admin:your_password@localhost:5432/sia_rtw_portal"

# NextAuth - Generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"  # Update for production

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-..."  # Get from https://console.anthropic.com

# Email Configuration (example using Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"  # Use app-specific password
SMTP_FROM="noreply@sia-rtw.com"

# Application
NEXT_PUBLIC_APP_NAME="SIA RTW Portal"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Migration

```bash
# Push schema to database
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

### 5. Seed Initial Data

Create initial categories and admin user:

```bash
# Create seed script (save as prisma/seed.ts)
```

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const categories = [
    {
      name: 'Temporary Work Restrictions',
      description: 'Questions about temporary restrictions and accommodations',
      icon: '⏰',
      sortOrder: 1,
    },
    {
      name: 'Permanent Work Restrictions',
      description: 'Discussions on permanent restrictions and long-term accommodations',
      icon: '📋',
      sortOrder: 2,
    },
    {
      name: 'Industrial Cases',
      description: 'Work-related injury cases and workers\' compensation',
      icon: '🏭',
      sortOrder: 3,
    },
    {
      name: 'Non-Industrial Cases',
      description: 'Non-work-related medical conditions and accommodations',
      icon: '🏥',
      sortOrder: 4,
    },
    {
      name: 'Bridge Assignments',
      description: 'Temporary alternative work assignments',
      icon: '🌉',
      sortOrder: 5,
    },
    {
      name: 'ADA/FEHA Compliance',
      description: 'Legal compliance questions and guidance',
      icon: '⚖️',
      sortOrder: 6,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12); // Change this!

  await prisma.user.upsert({
    where: { email: 'admin@sia.gov' },
    update: {},
    create: {
      email: 'admin@sia.gov',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
      department: 'IT',
      isActive: true,
    },
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add seed script to `package.json`:

```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

Run the seed:

```bash
npm install tsx --save-dev
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and login with:
- Email: `admin@sia.gov`
- Password: `admin123` (change this immediately!)

## Creating SD Member Accounts

### Option 1: Admin Panel (Recommended)

1. Login as admin
2. Navigate to Admin → User Management
3. Click "Add User"
4. Fill in details:
   - Email
   - Full Name
   - Role (MEMBER for SD members)
   - Department
5. System generates temporary password and sends email

### Option 2: Direct Database Insert

```typescript
// Script to create user
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser(email: string, fullName: string) {
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'MEMBER',
      isActive: true,
    },
  });

  console.log(`User created: ${email}`);
  console.log(`Temporary password: ${tempPassword}`);
  return user;
}
```

### Option 3: Bulk Import from CSV

Create script `scripts/import-users.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function importUsers(csvPath: string) {
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csv, { columns: true });

  for (const record of records) {
    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        email: record.email,
        fullName: record.fullName,
        role: record.role || 'MEMBER',
        department: record.department,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`Created: ${record.email} - Password: ${tempPassword}`);
  }
}

importUsers('./users.csv');
```

CSV format:
```csv
email,fullName,department,role
john.doe@sia.gov,John Doe,Safety Division,MEMBER
jane.smith@sia.gov,Jane Smith,Legal,LEGAL
```

## Chatbot Training Setup

### 1. Initial Training Data

Upload compliance documents and Q&A materials through the admin panel:

1. Login as admin
2. Navigate to Admin → Chatbot Training
3. Upload documents:
   - ADA/FEHA compliance PDFs
   - Historical Q&A emails (as text files)
   - Job description database
   - Bridge assignment templates

### 2. Vector Database Setup (Optional but Recommended)

For production-grade semantic search, set up Pinecone or pgvector:

#### Option A: Pinecone

```bash
# Sign up at https://www.pinecone.io
# Get API key and add to .env

PINECONE_API_KEY="your-key"
PINECONE_ENVIRONMENT="us-west1-gcp"
PINECONE_INDEX="sia-rtw-knowledge"
```

Install Pinecone client:

```bash
npm install @pinecone-database/pinecone
```

#### Option B: PostgreSQL pgvector

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to training_documents
ALTER TABLE training_documents
ADD COLUMN embedding vector(1536);
```

### 3. Automatic Forum Post Training

Configure automatic training of approved forum posts:

1. Admin reviews and marks helpful posts as "Approved for Training"
2. System automatically generates embeddings
3. Chatbot uses these in responses

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate app-specific password: https://myaccount.google.com/apppasswords
3. Add credentials to `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### Custom SMTP Server

```env
SMTP_HOST="mail.yourdomain.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASSWORD="your-password"
SMTP_FROM="SIA RTW Portal <noreply@yourdomain.com>"
```

## Production Deployment

### Option 1: Vercel (Recommended - Easiest)

1. Push code to GitHub
2. Visit https://vercel.com
3. Import repository
4. Add environment variables
5. Deploy

Vercel automatically handles:
- HTTPS/SSL
- CDN
- Auto-scaling
- Zero-downtime deployments

### Option 2: Docker + Cloud Provider

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

Build and deploy:

```bash
docker build -t sia-rtw-portal .
docker run -p 3000:3000 --env-file .env sia-rtw-portal
```

### Option 3: Traditional Server (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and build
git clone <repo-url>
cd sia-rtw-portal
npm install
npm run build

# Start with PM2
pm2 start npm --name "sia-rtw-portal" -- start
pm2 save
pm2 startup
```

Configure Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name rtw.sia.gov;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Hardening

### 1. Change Default Passwords

```sql
-- Change admin password
UPDATE users
SET password_hash = crypt('new_secure_password', gen_salt('bf'))
WHERE email = 'admin@sia.gov';
```

### 2. Enable HTTPS

Use Let's Encrypt for free SSL:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d rtw.sia.gov
```

### 3. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. Regular Backups

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump sia_rtw_portal > "$BACKUP_DIR/backup_$DATE.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

Set up cron job:

```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

## Monitoring and Maintenance

### 1. Application Monitoring

Use Sentry for error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 2. Database Monitoring

Monitor database performance:

```sql
-- View slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('sia_rtw_portal'));
```

### 3. Log Management

Configure log rotation:

```bash
# /etc/logrotate.d/sia-rtw-portal
/var/log/sia-rtw-portal/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U sia_admin -d sia_rtw_portal
```

### Email Not Sending

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check logs for email errors
pm2 logs sia-rtw-portal | grep -i email
```

### Chatbot Not Responding

- Verify ANTHROPIC_API_KEY is valid
- Check API rate limits
- Review training document embeddings
- Check logs for API errors

## Support and Documentation

- **Architecture**: See `ARCHITECTURE.md`
- **API Documentation**: See `docs/API.md` (to be created)
- **User Guide**: See `docs/USER_GUIDE.md` (to be created)

## Frequently Asked Questions

### Q: How do I add new SD members?

A: Use the Admin Panel → User Management → Add User. System will send them login credentials via email.

### Q: Can forum posts be made private?

A: Yes, users can mark posts as private when creating them. Only the author and admins can view private posts.

### Q: How does the chatbot get trained?

A: Admins upload documents through the admin panel. Forum posts marked as "approved for training" are automatically added to the knowledge base.

### Q: What happens when someone escalates to legal counsel?

A: The system creates an escalation ticket, assigns it to available legal counsel, and sends an email notification. Legal counsel can respond through the portal.

### Q: How are user credentials managed?

A: Passwords are hashed with bcrypt. First-time users receive a temporary password via email and are prompted to change it on first login.

### Q: Is the portal HIPAA compliant?

A: The application includes security features (encryption, audit logs, access controls), but full HIPAA compliance depends on your deployment environment, policies, and procedures. Consult with your compliance team.

## Next Steps

1. ✅ Complete initial setup
2. ✅ Create admin account
3. ✅ Add SD member accounts
4. ✅ Upload training documents
5. ✅ Test chatbot functionality
6. ✅ Configure email notifications
7. ✅ Set up production deployment
8. ✅ Train users
9. ✅ Monitor and maintain

## Contact

For technical support or questions about this implementation, contact your IT department or the development team.
