# Quick Start Guide - EverReach Assistant

**Get your bot online in 5 minutes!** 🚀

---

## ✅ Prerequisites Checklist

Your `.env` file is already configured with:
- ✅ `DISCORD_TOKEN` - Set
- ✅ `DISCORD_CLIENT_ID` - Set  
- ✅ `GUILD_ID_DEV` - Set
- ⚠️ `STARTUP_CHANNEL_ID` - **Not set** (optional but recommended)

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Startup Channel ID (Optional but Recommended)

This lets you see when the bot starts successfully!

**In Discord:**
1. Enable Developer Mode: Settings ⚙️ → Advanced → Developer Mode ON
2. Right-click on any text channel (e.g., #general or #bot-logs)
3. Click **"Copy Channel ID"**
4. Edit `.env` file and uncomment this line:
   ```env
   STARTUP_CHANNEL_ID=paste_your_channel_id_here
   ```

**Example:**
```env
STARTUP_CHANNEL_ID=1421474959154221999
```

---

### Step 2: Initialize Database

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate

# (Optional) Seed test data
yarn prisma:seed
```

---

### Step 3: Start the Bot

```bash
# Development mode (auto-restart on changes)
yarn dev

# Or standard start
yarn start
```

**Expected Output:**
```
[Bootstrap] 🚀 EverReach Assistant Discord Bot starting...
[Bootstrap] 📊 Environment: development
[DiscordService] Started refreshing application (/) commands.
[DiscordService] Successfully reloaded application (/) commands.
[DiscordClient] Discord bot logged in as EverReach#1234!
[DiscordClient] ✅ Startup notification sent to channel 1421474959...
```

**In Discord (if STARTUP_CHANNEL_ID configured):**
You'll see a green embed message:
```
🤖 Bot Started Successfully
EverReach Assistant is now online and ready!
Status: ✅ Connected
Version: 1.0.0
Environment: development
```

---

## 🎮 Test Your Bot

### 1. Check Bot Status
- Bot should show **ONLINE** (green) in member list

### 2. Test Slash Commands
Type `/` in any channel - you should see:
- `/register` - Register a character
- `/inv` - View inventory
- `/shop` - View shop
- `/buy` - Buy items
- `/history` - Transaction history
- `/trade` - Trading commands
- `/auction` - Auction commands
- `/note` - Notes commands

### 3. Try Your First Command
```
/register YourCharacterName
```

You should get a response confirming character creation!

---

## 🔧 Troubleshooting

### Bot Still Offline?

**Check Console:**
```bash
# Look for errors in the console
# Common issue: Invalid token
```

**Fix:**
1. Stop bot (Ctrl+C)
2. Go to https://discord.com/developers/applications
3. Bot → Token → **"Reset Token"**
4. Copy new token
5. Update `DISCORD_TOKEN` in `.env`
6. Restart: `yarn dev`

---

### Commands Not Showing?

**Check:**
1. ✅ Bot has `applications.commands` permission
2. ✅ Wait 5 minutes for Discord to update
3. ✅ Restart Discord app (Cmd+R or Ctrl+R)

**Re-invite Bot:**
1. Go to https://discord.com/developers/applications
2. OAuth2 → URL Generator
3. Check: ✅ **bot** + ✅ **applications.commands**
4. Select permissions (see DISCORD_SETUP.md)
5. Use generated URL to re-invite

---

### Database Errors?

**Your database path is:** `file:./data/database.db`

```bash
# Create data directory if it doesn't exist
mkdir -p data

# Run migrations
yarn prisma:migrate
```

---

## 📚 Need More Help?

### Detailed Guides:
- **[DISCORD_SETUP.md](./DISCORD_SETUP.md)** - Complete Discord configuration guide
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test all features
- **[ENV_TEMPLATE.md](./ENV_TEMPLATE.md)** - All environment variables explained

### Current Configuration Summary:
```
Discord Token:     ✅ Configured
Client ID:         ✅ Configured
Guild ID:          ✅ Configured
Startup Channel:   ⚠️ Not configured (optional)
Database:          ✅ Configured (./data/database.db)
Embeddings API:    ✅ Configured (OpenAI)
```

---

## 🎯 Next Steps

1. **Add startup channel** (recommended):
   - Right-click a channel → Copy Channel ID
   - Add to `.env`: `STARTUP_CHANNEL_ID=your_id`

2. **Start the bot**:
   ```bash
   yarn dev
   ```

3. **Test commands**:
   - Try `/register YourName`
   - Try `/shop`
   - Try `/buy health_potion 1`

4. **Monitor**:
   - Watch console for errors
   - Check startup message in Discord

---

**Your bot is ready to start! Run `yarn dev` now! 🚀**

