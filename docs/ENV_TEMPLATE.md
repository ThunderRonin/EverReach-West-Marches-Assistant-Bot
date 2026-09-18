# Environment Variables Template

Copy this content to create your `.env` file in the project root.

---

## Creating Your .env File

```bash
# From project root:
cp docs/ENV_TEMPLATE.md .env
# Then edit .env with your actual values
```

---

## Environment Variable Template

```env
# EverReach Assistant - Environment Configuration
# Fill in your values below

# ============================================
# Discord Configuration (REQUIRED)
# ============================================
# Get these from https://discord.com/developers/applications

# Your bot token (Bot → Token → Reset Token)
DISCORD_TOKEN=your_bot_token_here

# Your application ID (General Information → Application ID)
DISCORD_CLIENT_ID=your_application_id_here

# Your Discord server/guild ID (Right-click server → Copy Server ID)
GUILD_ID_DEV=your_guild_id_here

# Discord user ID of the bot owner for global admin privileges
BOT_OWNER_ID=your_discord_user_id_here

# Role name for Dungeon Masters in Discord servers (default: "Dungeon Master")
DM_ROLE_NAME="Dungeon Master"

# ============================================
# Startup Notification (OPTIONAL)
# ============================================
# Channel where bot sends startup message (Right-click channel → Copy Channel ID)
# Leave commented out if you don't want startup notifications
# STARTUP_CHANNEL_ID=your_channel_id_here

# ============================================
# Database Configuration (REQUIRED)
# ============================================
# PostgreSQL database connection string
DATABASE_URL="postgresql://everreach:everreach_secret@localhost:5432/everreach?schema=public"

# ============================================
# Environment (REQUIRED)
# ============================================
# Options: development, production
NODE_ENV=development
PORT=3000

# ============================================
# AI Embeddings (OPTIONAL)
# ============================================
# Only needed if you want semantic search in notes feature
# Get API key from https://platform.openai.com/api-keys
# EMBEDDING_DIM=384
# EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
# EMBEDDING_API_KEY=your_openai_api_key_here
```

---

## Required vs Optional Variables

### ✅ Required (Bot won't start without these)
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `GUILD_ID_DEV`
- `DATABASE_URL`
- `NODE_ENV`

### ⚠️ Optional (Bot works without these)
- `STARTUP_CHANNEL_ID` - Startup notification channel
- `EMBEDDING_API_URL` - AI embeddings API endpoint
- `EMBEDDING_API_KEY` - AI embeddings API key

---

## Getting Your Values

### Discord Token
1. Go to https://discord.com/developers/applications
2. Select your application
3. Click **"Bot"** in sidebar
4. Under **"Token"**, click **"Reset Token"** (or "Copy")
5. Copy the token immediately

### Application/Client ID
1. In Discord Developer Portal
2. Select your application
3. Click **"General Information"**
4. Copy **"Application ID"**

### Guild ID (Server ID)
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server icon
3. Click **"Copy Server ID"**

### Channel ID (for startup notifications)
1. Enable Developer Mode (see above)
2. Right-click any text channel
3. Click **"Copy Channel ID"**
4. Recommended: Create `#bot-logs` channel for this

---

## Security Best Practices

### ✅ Do's
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Keep tokens secret
- ✅ Use different tokens for dev/production
- ✅ Rotate tokens periodically

### ❌ Don'ts
- ❌ NEVER commit `.env` to git
- ❌ NEVER share tokens publicly
- ❌ NEVER use production tokens in development
- ❌ NEVER hardcode tokens in source files

### 🔒 If Token is Compromised
1. Go to Discord Developer Portal immediately
2. Bot → Token → **"Reset Token"**
3. Update `.env` with new token
4. Restart bot

---

## Example .env (with fake values)

```env
# Example - DO NOT USE THESE VALUES
DISCORD_TOKEN=MTk4NjIyNDgzNDcxOTI1MjQ4.GK7cCv.dQw4w9WgXcQ
DISCORD_CLIENT_ID=1234567890123456789
GUILD_ID_DEV=9876543210987654321
BOT_OWNER_ID=123456789012345678
DM_ROLE_NAME="Dungeon Master"
STARTUP_CHANNEL_ID=1111111111111111111
DATABASE_URL="postgresql://everreach:everreach_secret@localhost:5432/everreach?schema=public"
NODE_ENV=development
PORT=3000
```

**Note**: These are example values - they won't work. Use your actual values from Discord Developer Portal.

---

## Verification

After creating `.env`, verify it's correct:

```bash
# Check file exists
ls -la .env

# View contents (be careful - contains secrets!)
cat .env

# Verify it's in .gitignore
git status  # .env should NOT appear
```

---

## Related Documentation

- **[DISCORD_SETUP.md](./DISCORD_SETUP.md)** - Complete Discord setup guide
- **[DM_PERMISSIONS_GUIDE.md](./DM_PERMISSIONS_GUIDE.md)** - Dungeon Master role & admin permissions guide
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test the bot
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Deployment overview

---

**Ready to configure your bot!** Create your `.env` file and start testing.

