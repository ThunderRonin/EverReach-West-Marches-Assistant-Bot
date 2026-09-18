# Discord Bot Setup Guide

**Purpose**: Step-by-step guide to configure your bot in Discord Developer Portal  
**Issue**: Bot offline, no commands registered

---

## 🤖 Discord Developer Portal Setup

### Step 1: Access Discord Developer Portal

1. Go to: https://discord.com/developers/applications
2. Log in with your Discord account
3. Click **"New Application"** (or select existing application)
4. Give it a name (e.g., "EverReach Assistant")
5. Click **"Create"**

---

### Step 2: Configure Bot Settings

#### 2.1 General Information
1. Click on your application
2. Go to **"General Information"** tab
3. Copy your **"Application ID"** (this is your `DISCORD_CLIENT_ID`)
4. (Optional) Add an app icon and description

#### 2.2 Create/Configure Bot
1. Click **"Bot"** in the left sidebar
2. If no bot exists, click **"Add Bot"** → **"Yes, do it!"**
3. Under **"Token"** section:
   - Click **"Reset Token"** (or "Copy" if first time)
   - **⚠️ Copy this token immediately** - you won't see it again!
   - This is your `DISCORD_TOKEN`

#### 2.3 Bot Permissions (Important!)
Still on the Bot page, scroll down to **"Privileged Gateway Intents"**:

**Enable these intents:**
- ✅ **Server Members Intent** (**REQUIRED** - needed for Dungeon Master role verification and member fetching)
- ✅ **Message Content Intent** (if bot needs to read messages)
- ⚠️ **Presence Intent** (only if needed)

**Bot Settings:**
- ✅ **Public Bot** - ON (if you want others to invite it)
- ❌ **Requires OAuth2 Code Grant** - OFF

---

### Step 3: OAuth2 Configuration

#### 3.1 Set OAuth2 URL Generator
1. Click **"OAuth2"** → **"URL Generator"** in left sidebar

#### 3.2 Select Scopes
Check these boxes under **SCOPES**:
- ✅ **bot**
- ✅ **applications.commands**

#### 3.3 Select Bot Permissions
Under **BOT PERMISSIONS**, check:

**General Permissions:**
- ✅ **Read Messages/View Channels**

**Text Permissions:**
- ✅ **Send Messages**
- ✅ **Send Messages in Threads**
- ✅ **Embed Links**
- ✅ **Attach Files**
- ✅ **Read Message History**
- ✅ **Add Reactions**
- ✅ **Use Slash Commands**

**Calculated Permissions Value:** (will be displayed at bottom)
Copy this number or use the generated URL below.

#### 3.4 Copy Generated URL
At the bottom, you'll see a **"GENERATED URL"**
- Copy this URL
- **This is your invite link!**

---

### Step 4: Invite Bot to Your Server

1. **Paste the generated URL** into your browser
2. Select the server you want to add the bot to
   - You must have **"Manage Server"** permission
3. Click **"Continue"**
4. **Review permissions** (make sure all are checked)
5. Click **"Authorize"**
6. Complete the captcha
7. ✅ Bot should now appear in your server's member list

**Expected Result:** Bot appears **OFFLINE** (gray) - this is normal until you start it!

---

### Step 5: Get Your Server/Guild ID

#### Enable Developer Mode in Discord:
1. Open Discord app
2. Click **⚙️ User Settings** (bottom left)
3. Go to **"Advanced"** (under "App Settings")
4. Enable **"Developer Mode"**
5. Click **"✓"** to save

#### Get Guild ID:
1. Right-click on your server icon (left sidebar)
2. Click **"Copy Server ID"**
3. This is your `GUILD_ID_DEV`

---

### Step 6: Get Startup Notification Channel ID (Optional)

**Purpose**: Bot will send a "Hello World!" message when it starts up

#### Get Channel ID:
1. Make sure **Developer Mode** is enabled (see Step 5)
2. Right-click on a channel (e.g., #bot-logs or #general)
3. Click **"Copy Channel ID"**
4. This is your `STARTUP_CHANNEL_ID`

**Recommended**: Create a dedicated `#bot-logs` channel for bot notifications

---

### Step 7: Dungeon Master (DM) Role Setup

The bot uses Discord's native role hierarchy for campaign administrators and DMs:

1. **Create the Role in Discord**:
   - Go to **Server Settings** (`⚙️`) → **Roles** → **Create Role**.
   - Name it **`Dungeon Master`** (case-insensitive).
   - Assign the role to your campaign's Dungeon Masters.
2. **Configure Bot Owner (Superadmin)**:
   - In Discord, right-click your own user profile → **Copy User ID**.
   - Add this ID as `BOT_OWNER_ID` in your `.env` file (gives global DM command permissions anywhere, including DMs).
3. **Customize Role Name (Optional)**:
   - If your server uses a different role name (e.g., "Game Master" or "DM"), set `DM_ROLE_NAME="Game Master"` in `.env`.
4. **See Full Guide**: For detailed instructions and security architecture, refer to [DM_PERMISSIONS_GUIDE.md](./DM_PERMISSIONS_GUIDE.md).

---

### Step 8: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Discord Configuration
# Copy these from Discord Developer Portal
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID_HERE
GUILD_ID_DEV=YOUR_SERVER_ID_HERE
BOT_OWNER_ID=YOUR_USER_ID_HERE
DM_ROLE_NAME="Dungeon Master"

# Optional: Startup Notification Channel
# Bot will send a message here when it starts (great for monitoring!)
STARTUP_CHANNEL_ID=YOUR_CHANNEL_ID_HERE

# PostgreSQL Database Configuration
DATABASE_URL="postgresql://everreach:everreach_secret@localhost:5432/everreach?schema=public"

# Environment
NODE_ENV=development

# Optional: AI Embeddings (for notes feature)
# EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
# EMBEDDING_API_KEY=your_openai_key
```

**⚠️ Security Notes:**
- ✅ Add `.env` to `.gitignore`
- ❌ NEVER commit tokens to git
- ❌ NEVER share your bot token
- ⚠️ If token is leaked, reset it immediately in Discord Portal

---

### Step 9: Start Your Bot

```bash
# Install dependencies (if not done)
yarn install

# Generate Prisma client
yarn prisma:generate

# Run database migrations
yarn prisma:migrate

# Start the bot
yarn dev
```

**Expected Console Output:**
```
[Bootstrap] 🚀 EverReach Assistant Discord Bot starting...
[Bootstrap] 📊 Environment: development
[DiscordService] Started refreshing application (/) commands.
[DiscordService] Successfully reloaded application (/) commands.
[DiscordClient] Discord bot logged in as YourBot#1234!
[DiscordClient] ✅ Startup notification sent to channel 123456789
```

---

### Step 10: Verify Bot is Online

1. **Check Discord Server:**
   - Bot should now show as **ONLINE** (green dot)
   - Bot should appear in member list

2. **Check Startup Message** (if STARTUP_CHANNEL_ID configured):
   - Look in your configured channel
   - You should see a green embed message:
     ```
     🤖 Bot Started Successfully
     EverReach Assistant is now online and ready!
     Status: ✅ Connected
     Version: 1.0.0
     Environment: development
     ```

3. **Test Slash Commands:**
   - Type `/` in any channel
   - You should see your bot's commands in the list
   - Commands should include:
     - `/register` - Register a character
     - `/inv` - View inventory and gold
     - `/shop` - Browse the shop
     - `/buy` - Purchase an item from the shop
     - `/history` - View transaction logs
     - `/trade` - Player-to-player trade system (`start`, `offer`, `accept`, `cancel`)
     - `/auction` - Item auction system (`create`, `bid`, `view`, `list`)
     - `/note` - Personal notes system (`add`, `search`, `list`, `delete`)
     - `/admin` - DM/Admin commands (`item-add`, `item-update`, `item-delete`, `item-list`, `dm-list`)

4. **Test a Command:**
   ```
   /register name:TestCharacter
   ```
   - Bot should respond (might be ephemeral - only you see it)

---

## 🔧 Troubleshooting

### Issue: Bot Still Offline

**Check:**
1. ✅ Bot token is correct in `.env`
2. ✅ No spaces or quotes around token
3. ✅ `.env` file is in project root
4. ✅ Bot is started (`yarn dev`)
5. ✅ No error messages in console

**Solution:**
```bash
# Stop the bot (Ctrl+C)
# Verify .env file
cat .env | grep DISCORD_TOKEN

# Restart
yarn dev
```

---

### Issue: No Slash Commands Showing

**Possible Causes:**
1. ❌ Bot invited without `applications.commands` scope
2. ❌ Commands not registered (check console logs)
3. ❌ Discord cache (wait 5 minutes or restart Discord)

**Solution 1: Re-invite bot with correct permissions**
1. Generate new invite URL (Step 3)
2. Make sure ✅ **applications.commands** is checked
3. Use new URL to re-invite bot

**Solution 2: Force Discord refresh**
```
# Windows/Linux: Ctrl+R
# Mac: Cmd+R
# Or completely restart Discord app
```

**Solution 3: Check bot logs**
```bash
# Look for this in console:
# [DiscordService] Successfully reloaded application (/) commands.
```

---

### Issue: Commands Show But Don't Work

**Check:**
1. ✅ Bot has permissions in the channel
2. ✅ Bot role is above other roles (if role restrictions)
3. ✅ Check bot console for errors

**Solution:**
```bash
# Server Settings → Roles
# Drag bot role higher in the list
# Check channel permissions for bot role
```

---

### Issue: "Invalid Token" Error

**Solution:**
1. Go back to Discord Developer Portal
2. Bot → Token → **"Reset Token"**
3. Copy NEW token
4. Update `.env` file
5. Restart bot

---

### Issue: "Missing Access" or "Missing Permissions"

**Check Channel Permissions:**
1. Right-click channel → **"Edit Channel"**
2. Go to **"Permissions"** tab
3. Click **"+"** → Select your bot role
4. Enable:
   - ✅ View Channel
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Use Slash Commands

---

## 📋 Quick Checklist

Before starting bot, verify:

- [ ] Discord application created
- [ ] Bot added to application
- [ ] **Privileged Gateway Intents**: "Server Members Intent" enabled in Developer Portal
- [ ] Bot token copied
- [ ] Application ID copied
- [ ] Server/Guild ID copied
- [ ] Bot owner Discord ID copied (`BOT_OWNER_ID`)
- [ ] "Dungeon Master" role created in Discord server and assigned to DMs
- [ ] Bot invited with correct permissions (bot + applications.commands)
- [ ] `.env` file created with all values
- [ ] Dependencies installed (`yarn install`)
- [ ] Prisma generated (`yarn prisma:generate`)
- [ ] Database migrated (`yarn prisma:migrate`)
- [ ] Bot started (`yarn dev`)
- [ ] Bot shows ONLINE in Discord
- [ ] Slash commands appear when typing `/`

---

## 🔐 Permission Calculator

If you need the exact permission integer for the invite URL:

**Required Permissions (checked):**
- Read Messages/View Channels
- Send Messages
- Embed Links
- Use Slash Commands
- Send Messages in Threads
- Read Message History
- Add Reactions

**Permission Integer:** `274878024768`

**Manual Invite URL Template:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your Application ID.

---

## 📚 Additional Resources

### Discord Documentation
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Bot Guide](https://discord.com/developers/docs/getting-started)
- [Discord Permissions Calculator](https://discordapi.com/permissions.html)
- [Discord.js Guide](https://discordjs.guide/)

### Project Documentation
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - How to test the bot
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Project overview
- [README.md](./README.md) - Documentation index

---

## 🆘 Still Having Issues?

### Check Console Errors
```bash
# Run bot and watch for errors
yarn dev

# Common errors and meanings:
# "Invalid token" → Token is wrong, reset it
# "Missing Access" → Bot needs permissions
# "Unknown interaction" → Command not registered
```

### Verify Environment Variables
```bash
# Check .env exists and has values
cat .env

# Should see:
# DISCORD_TOKEN=MTxxxxx...
# DISCORD_CLIENT_ID=123456789...
# GUILD_ID_DEV=987654321...
```

### Test Connection
```bash
# Stop bot
# Start in debug mode
NODE_ENV=development yarn dev

# Watch console for:
# ✅ "Successfully reloaded application (/) commands"
# ✅ Discord client should log in
```

---

## 🎯 Expected Final State

When everything is configured correctly:

1. **Discord Developer Portal:**
   - ✅ Application exists
   - ✅ Bot created with token
   - ✅ Required intents enabled

2. **Discord Server:**
   - ✅ Bot is member of server
   - ✅ Bot shows ONLINE (green)
   - ✅ Bot has a role (auto-created)

3. **Slash Commands:**
   - ✅ Type `/` shows bot commands
   - ✅ Commands list appears (8 main commands)
   - ✅ Commands respond when used

4. **Bot Console:**
   - ✅ No error messages
   - ✅ "Successfully reloaded commands" message
   - ✅ Bot stays running

---

**Your bot should now be online and working! 🎉**

If you're still having issues, share the console output and I can help debug further.

