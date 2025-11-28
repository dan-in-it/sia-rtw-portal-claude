# PostgreSQL Database Setup Guide

This guide will help you set up PostgreSQL for the SIA RTW Portal on different platforms.

## Quick Start (Recommended for Testing)

### Option 1: Use Docker (Easiest - Works on All Platforms)

```bash
# Pull and run PostgreSQL in Docker
docker run --name sia-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sia_rtw_portal \
  -p 5432:5432 \
  -d postgres:15

# Your DATABASE_URL will be:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sia_rtw_portal?schema=public"
```

Stop/Start container:
```bash
docker stop sia-postgres
docker start sia-postgres
```

### Option 2: Cloud Database (No Local Installation)

**Supabase (Free tier, easiest)**
1. Go to https://supabase.com and sign up
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI format)
5. Use that as your DATABASE_URL in .env

**Neon (Free tier, serverless)**
1. Go to https://neon.tech and sign up
2. Create a project
3. Copy the connection string
4. Use that as your DATABASE_URL in .env

## Platform-Specific Setup

### Windows

#### Step 1: Install PostgreSQL

Download from https://www.postgresql.org/download/windows/

**During installation:**
- Set a password for the postgres user (remember this!)
- Default port: 5432
- Note the installation directory

**After installation:**
- PostgreSQL should start automatically
- Check in Services (Win+R → services.msc) that "postgresql-x64-15" is running

#### Step 2: Create Database

**Option A: Using pgAdmin (GUI - Installed with PostgreSQL)**
1. Open pgAdmin 4
2. Connect to PostgreSQL (localhost)
3. Right-click "Databases" → Create → Database
4. Name: `sia_rtw_portal`
5. Click Save

**Option B: Using Command Line**
```powershell
# Open PowerShell as Administrator
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\15\bin"

# Create database
.\psql.exe -U postgres -c "CREATE DATABASE sia_rtw_portal;"

# Verify it was created
.\psql.exe -U postgres -c "\l"
```

#### Step 3: Configure .env

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sia_rtw_portal?schema=public"
```

Replace `your_password` with the password you set during PostgreSQL installation.

#### Common Windows Issues

**Issue: "psql is not recognized"**
```powershell
# Add PostgreSQL to PATH
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

**Issue: "authentication error"**

1. Find `pg_hba.conf` (usually in `C:\Program Files\PostgreSQL\15\data`)
2. Open in Notepad as Administrator
3. Find the line with `127.0.0.1/32` and change method to `md5`:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```
4. Restart PostgreSQL service:
```powershell
Restart-Service postgresql-x64-15
```

### macOS

#### Step 1: Install PostgreSQL

**Using Homebrew (Recommended):**
```bash
# Install Homebrew if you haven't: https://brew.sh
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb sia_rtw_portal
```

**Using Postgres.app (GUI):**
1. Download from https://postgresapp.com
2. Move to Applications
3. Open Postgres.app
4. Click "Initialize"
5. Database server will start on port 5432

#### Step 2: Configure .env

```env
# If using Homebrew (no password by default)
DATABASE_URL="postgresql://localhost:5432/sia_rtw_portal?schema=public"

# If using Postgres.app
DATABASE_URL="postgresql://postgres@localhost:5432/sia_rtw_portal?schema=public"
```

### Linux (Ubuntu/Debian)

#### Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In psql prompt:
CREATE DATABASE sia_rtw_portal;
CREATE USER sia_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sia_rtw_portal TO sia_admin;

# Grant schema privileges
\c sia_rtw_portal
GRANT ALL ON SCHEMA public TO sia_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sia_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sia_admin;

# Exit
\q
```

#### Step 3: Configure .env

```env
DATABASE_URL="postgresql://sia_admin:your_secure_password@localhost:5432/sia_rtw_portal?schema=public"
```

## Verify Database Connection

After setting up, verify the connection works:

```bash
# Test connection with Prisma
npm run db:push

# If successful, seed the database
npm run db:seed
```

## Troubleshooting

### Error: "authentication error: unsupported authentication method"

**Solution 1: Update connection string**
```env
# Add sslmode parameter
DATABASE_URL="postgresql://postgres:password@localhost:5432/sia_rtw_portal?schema=public&sslmode=prefer"
```

**Solution 2: Modify PostgreSQL authentication**

Edit `pg_hba.conf`:
- **Windows**: `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
- **macOS (Homebrew)**: `/opt/homebrew/var/postgresql@15/pg_hba.conf`
- **Linux**: `/etc/postgresql/15/main/pg_hba.conf`

Change authentication method from `scram-sha-256` to `md5`:
```
# Change:
host    all             all             127.0.0.1/32            scram-sha-256

# To:
host    all             all             127.0.0.1/32            md5
```

Restart PostgreSQL:
- **Windows**: Restart the PostgreSQL service from Services
- **macOS**: `brew services restart postgresql@15`
- **Linux**: `sudo systemctl restart postgresql`

### Error: "database 'sia_rtw_portal' does not exist"

Create the database:
```bash
# Windows (PowerShell)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sia_rtw_portal;"

# macOS/Linux
createdb sia_rtw_portal

# Or using psql
psql -U postgres -c "CREATE DATABASE sia_rtw_portal;"
```

### Error: "password authentication failed"

1. Double-check your password in the DATABASE_URL
2. Reset the postgres user password:

```bash
# Connect as postgres superuser
psql -U postgres

# In psql:
ALTER USER postgres WITH PASSWORD 'newpassword';
\q
```

Update your .env with the new password.

### Error: "could not connect to server"

PostgreSQL service is not running:

**Windows:**
```powershell
# Check status
Get-Service postgresql-x64-15

# Start service
Start-Service postgresql-x64-15
```

**macOS:**
```bash
# Homebrew
brew services start postgresql@15

# Postgres.app - just open the app
```

**Linux:**
```bash
# Check status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql
```

### Error: "port 5432 is already in use"

Another PostgreSQL instance or application is using the port:

**Find what's using the port:**
```bash
# Windows
netstat -ano | findstr :5432

# macOS/Linux
lsof -i :5432
```

**Options:**
1. Stop the other PostgreSQL instance
2. Use a different port in your DATABASE_URL (e.g., 5433)

## Database Management Tools

### GUI Tools

**pgAdmin 4** (Included with PostgreSQL)
- View and manage databases
- Run SQL queries
- Monitor performance

**DBeaver** (Free, cross-platform)
- Download: https://dbeaver.io
- Supports multiple database types
- Great for migrations

**Prisma Studio** (Built-in)
```bash
npm run db:studio
```
- Web-based GUI for your database
- Automatically uses your DATABASE_URL

### Command Line Tools

**psql** - PostgreSQL command line
```bash
# Connect to database
psql -U postgres -d sia_rtw_portal

# Common commands:
\l              # List databases
\dt             # List tables
\d users        # Describe users table
\q              # Quit
```

## Best Practices

### Development
- Use Docker or cloud database for easy setup
- Use `npm run db:push` for quick schema updates
- Use Prisma Studio (`npm run db:studio`) to view data

### Production
- Use migrations instead of db:push
- Enable connection pooling
- Set up regular backups
- Use strong passwords
- Enable SSL connections
- Restrict network access

### Backup and Restore

**Backup:**
```bash
# Full database backup
pg_dump -U postgres sia_rtw_portal > backup.sql

# Compressed backup
pg_dump -U postgres -Fc sia_rtw_portal > backup.dump
```

**Restore:**
```bash
# From SQL file
psql -U postgres sia_rtw_portal < backup.sql

# From compressed dump
pg_restore -U postgres -d sia_rtw_portal backup.dump
```

## Next Steps

Once your database is set up:

1. ✅ Verify connection: `npm run db:push`
2. ✅ Seed initial data: `npm run db:seed`
3. ✅ Start the application: `npm run dev`
4. ✅ Login with test credentials:
   - Email: admin@sia-jpa.org
   - Password: admin123

## Getting Help

If you're still having issues:

1. Check the PostgreSQL logs:
   - **Windows**: `C:\Program Files\PostgreSQL\15\data\log\`
   - **macOS**: `/opt/homebrew/var/log/postgresql@15.log`
   - **Linux**: `/var/log/postgresql/`

2. Verify PostgreSQL is listening:
```bash
# Windows
netstat -an | findstr 5432

# macOS/Linux
netstat -an | grep 5432
```

3. Test connection directly:
```bash
psql "postgresql://postgres:password@localhost:5432/sia_rtw_portal"
```

If the above command works but Prisma doesn't, the issue is with the connection string format in your .env file.
