# PostgreSQL & OpenRouter Migration Guide

**Date**: October 9, 2025  
**Status**: Configuration Ready - Awaiting PostgreSQL Setup

---

## ✅ Migration Status

### Completed
- ✅ Updated `docker-compose.yml` with PostgreSQL service
- ✅ Updated Prisma schema to use PostgreSQL
- ✅ Updated notes service to support OpenRouter API
- ✅ Updated `.env` configuration

### Pending
- ⚠️ **PostgreSQL needs to be started** (Docker or local install)
- ⚠️ **Migrations need to be run** once PostgreSQL is ready
- ⚠️ **OpenRouter API key** needs to be configured (if using embeddings)

---

## 🐘 PostgreSQL Setup Options

You have 3 options to run PostgreSQL:

### Option 1: Docker (Recommended)

#### Start Docker Desktop
1. Open Docker Desktop application
2. Wait for it to start (whale icon in menu bar should be stable)
3. Verify: `docker ps` should work

#### Start PostgreSQL
```bash
# Start just PostgreSQL
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

---

### Option 2: Install PostgreSQL Locally (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database and user
createuser -s everreach
createdb -O everreach everreach_db
```

#### Update .env for local PostgreSQL
```env
DATABASE_URL="postgresql://everreach@localhost:5432/everreach_db?schema=public"
```

---

### Option 3: Use Cloud PostgreSQL

Popular options:
- **Supabase** (free tier): https://supabase.com
- **Neon** (free tier): https://neon.tech  
- **Railway** (free tier): https://railway.app

Get the connection string and update `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

---

## 🚀 After PostgreSQL is Running

### Step 1: Delete Old SQLite Migrations

```bash
# Backup current migrations
mkdir -p prisma/migrations_backup
mv prisma/migrations/* prisma/migrations_backup/ 2>/dev/null || true

# Remove migration lock
rm prisma/migrations/migration_lock.toml 2>/dev/null || true
```

### Step 2: Create New PostgreSQL Migration

```bash
# Generate Prisma client
yarn prisma:generate

# Create initial migration
yarn prisma migrate dev --name init_postgres

# This will:
# - Create new migration files
# - Apply them to PostgreSQL
# - Generate updated Prisma client
```

### Step 3: Seed Database (Optional)

```bash
yarn prisma:seed
```

### Step 4: Start the Bot

```bash
yarn dev
```

---

## 🔄 OpenRouter Configuration

### Get OpenRouter API Key

1. Go to https://openrouter.ai
2. Sign up / log in
3. Go to **Keys** page
4. Create a new API key
5. Copy the key

### Update .env

```env
EMBEDDING_API_URL=https://openrouter.ai/api/v1
EMBEDDING_API_KEY=your_openrouter_key_here
EMBEDDING_MODEL=openai/text-embedding-3-small
```

### Supported Models

OpenRouter supports various embedding models:
- `openai/text-embedding-3-small` (1536 dimensions) - **Recommended**
- `openai/text-embedding-3-large` (3072 dimensions)
- `openai/text-embedding-ada-002` (1536 dimensions)

**Note**: Update `EMBEDDING_DIM` to match your model's dimensions.

---

## 📋 Complete Migration Checklist

### Prerequisites
- [ ] Docker Desktop running OR PostgreSQL installed locally
- [ ] OpenRouter account created (if using embeddings)

### Database Migration
- [ ] PostgreSQL service is running
- [ ] Old SQLite migrations backed up
- [ ] New PostgreSQL migration created (`yarn prisma migrate dev`)
- [ ] Database seeded (`yarn prisma:seed`)

### Configuration
- [ ] `.env` updated with PostgreSQL connection string
- [ ] `.env` updated with OpenRouter API key
- [ ] `.env` updated with correct embedding model
- [ ] `.env` updated with correct EMBEDDING_DIM (1536 for text-embedding-3-small)

### Verification
- [ ] `yarn build` passes
- [ ] `yarn prisma:generate` works
- [ ] Bot starts successfully (`yarn dev`)
- [ ] Bot shows ONLINE in Discord
- [ ] Startup notification appears (if configured)
- [ ] Commands work (`/register`, `/shop`, etc.)

---

## 🐳 Docker Setup Instructions

### Current docker-compose.yml Configuration

Your `docker-compose.yml` now includes:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: everreach
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-everreach_password}
      POSTGRES_DB: everreach_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  everreach-bot:
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://everreach:${POSTGRES_PASSWORD}@postgres:5432/everreach_db
      # ... other vars
```

### Starting with Docker

```bash
# Start PostgreSQL only (for development)
docker-compose up -d postgres

# Or start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

---

## 🔍 Troubleshooting

### Docker Won't Start

**Issue**: `Cannot connect to the Docker daemon`

**Solution**:
1. Open Docker Desktop application
2. Wait for Docker to fully start
3. Run `docker ps` to verify
4. Try again: `docker-compose up -d postgres`

---

### PostgreSQL Connection Refused

**Check if running**:
```bash
# With Docker
docker-compose ps

# With local install
brew services list | grep postgresql
```

**Test connection**:
```bash
# With Docker
docker exec -it everreach-postgres psql -U everreach -d everreach_db

# Local
psql -U everreach -d everreach_db
```

---

### Migration Fails

**Clean slate**:
```bash
# Stop bot
pkill -f "nest start"

# Drop and recreate (CAUTION: deletes data!)
yarn prisma migrate reset

# Or manually
docker-compose down -v postgres
docker-compose up -d postgres
sleep 10
yarn prisma migrate dev
```

---

### OpenRouter API Errors

**Check API key**:
```bash
# Test with curl
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $EMBEDDING_API_KEY"
```

**Common issues**:
- Invalid API key → Get new one from https://openrouter.ai/keys
- Rate limit → Check your OpenRouter dashboard
- Invalid model → Use `openai/text-embedding-3-small`

---

## 📊 What Changed

### Files Modified

1. **docker-compose.yml**
   - Added PostgreSQL service
   - Updated bot to depend on PostgreSQL
   - Changed DATABASE_URL to PostgreSQL connection string

2. **prisma/schema.prisma**
   - Changed provider from `sqlite` to `postgresql`

3. **src/notes/notes.service.ts**
   - Added configurable model support
   - Updated API endpoint to append `/embeddings`
   - Works with both OpenAI and OpenRouter

4. **.env**
   - Updated DATABASE_URL for PostgreSQL
   - Changed EMBEDDING_API_URL to OpenRouter
   - Added EMBEDDING_MODEL configuration
   - Updated EMBEDDING_DIM to 1536

---

## 🎯 Next Steps

### Immediate Actions

1. **Start Docker Desktop** (if using Docker)
   - Or install PostgreSQL locally with Homebrew

2. **Start PostgreSQL**:
   ```bash
   docker-compose up -d postgres
   ```

3. **Create Migrations**:
   ```bash
   yarn prisma migrate dev --name init_postgres
   ```

4. **Start Bot**:
   ```bash
   yarn dev
   ```

5. **Verify in Discord**:
   - Bot shows ONLINE
   - Startup message appears
   - Commands work

---

## 📝 Environment Variables Summary

```env
# Required for bot
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
GUILD_ID_DEV=...

# Required for database
DATABASE_URL=postgresql://everreach:everreach_password@localhost:5432/everreach_db
POSTGRES_PASSWORD=everreach_password

# Optional for embeddings
EMBEDDING_API_URL=https://openrouter.ai/api/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIM=1536

# Optional for startup notification
STARTUP_CHANNEL_ID=...
```

---

## 🔄 Rollback (if needed)

To go back to SQLite:

1. Change `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```env
   DATABASE_URL="file:./prisma/data/database.db"
   ```

3. Run migrations:
   ```bash
   yarn prisma:generate
   yarn start
   ```

---

**Migration is ready! Start PostgreSQL and run the migration to complete the setup.**

