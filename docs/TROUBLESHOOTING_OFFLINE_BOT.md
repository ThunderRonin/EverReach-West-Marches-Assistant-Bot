# Troubleshooting: Bot Offline

**Issue**: Bot shows offline in Discord  
**Date**: October 9, 2025

---

## 🔍 **Quick Diagnostic Checklist**

Run these commands to diagnose the issue:

### 1. Check if Bot Process is Running
```bash
ps aux | grep "nest start" | grep -v grep
```
- ✅ **If output shown**: Process is running
- ❌ **If no output**: Bot crashed - see logs below

### 2. Check Recent Logs
```bash
tail -100 /tmp/necord-start.log | grep -E "(ERROR|WARN|Ready|logged in)"
```
- ✅ **Look for**: "Discord bot logged in as..."
- ❌ **Look for**: Any ERROR messages

### 3. Verify Environment Variables
```bash
cat .env | grep -E "(DISCORD_TOKEN|DISCORD_CLIENT_ID|GUILD_ID)"
```
- ✅ All three should have values
- ❌ If any are missing, bot won't connect

### 4. Check PostgreSQL Connection
```bash
docker-compose ps
```
- ✅ postgres should show "Up" and "healthy"

### 5. Stop and Restart with Visible Logs
```bash
pkill -f "nest start"
yarn dev
```
Watch the output for errors

---

## 📋 **Systematic Troubleshooting**

### **Level 1: Environment & Configuration**

#### ☑️ Check 1: Discord Token is Valid
```bash
# View your token (first 20 chars)
cat .env | grep DISCORD_TOKEN | cut -c1-40
```

**Verify**:
- [ ] Token starts with `MT` (Bot tokens always start with this)
- [ ] Token has no extra spaces or quotes
- [ ] Token is on a single line

**If invalid**:
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to **Bot** → **Reset Token**
4. Copy new token
5. Update `.env`:
   ```bash
   nano .env
   # Update DISCORD_TOKEN=your_new_token
   ```
6. Restart: `pkill -f "nest start" && yarn dev`

---

#### ☑️ Check 2: Client ID Matches
```bash
cat .env | grep DISCORD_CLIENT_ID
```

**Verify**:
- [ ] ID is numeric (18-19 digits)
- [ ] Matches Application ID in Discord Developer Portal

**To verify**:
1. Go to Discord Developer Portal
2. General Information → Application ID
3. Compare with your `.env` value

---

#### ☑️ Check 3: Guild ID is Correct
```bash
cat .env | grep GUILD_ID_DEV
```

**Verify**:
- [ ] ID is numeric (18-19 digits)
- [ ] Matches your Discord server ID

**To get Guild ID**:
1. Enable Developer Mode in Discord
2. Right-click your server icon
3. "Copy Server ID"
4. Compare with `.env` value

---

### **Level 2: Bot Permissions & Intents**

#### ☑️ Check 4: Bot Intents Enabled in Discord Portal

**Go to**: Discord Developer Portal → Bot → Privileged Gateway Intents

**Required Intents**:
- [ ] ✅ **Server Members Intent** - ON
- [ ] ✅ **Message Content Intent** - ON

**How to enable**:
1. Toggle them ON
2. Click **Save Changes**
3. Restart your bot

---

#### ☑️ Check 5: Bot is Invited with Correct Scopes

**Required**:
- [ ] `bot` scope
- [ ] `applications.commands` scope

**To verify/fix**:
1. Go to OAuth2 → URL Generator
2. Check: ✅ **bot** + ✅ **applications.commands**
3. Select permissions (Send Messages, Use Slash Commands, etc.)
4. Copy generated URL
5. Use URL to re-invite bot
6. Restart bot after re-inviting

---

### **Level 3: Code & Build Issues**

#### ☑️ Check 6: Build is Successful
```bash
yarn build
```

**Expected**: "Done" with no errors

**If errors**:
- Read the error message
- Fix the TypeScript/import errors
- Rebuild

---

#### ☑️ Check 7: No Import Errors
```bash
yarn lint
```

**Expected**: "Done" with 0 errors

**If errors**:
- Review linting errors
- Fix and rebuild

---

### **Level 4: Necord Configuration**

#### ☑️ Check 8: Necord Config is Valid

View the config:
```bash
cat src/discord/necord.config.ts
```

**Should have**:
- [ ] Valid `token` from environment
- [ ] Correct intents (Guilds, GuildMessages, MessageContent)
- [ ] Development guild ID if set

**Test the config**:
```typescript
// In necord.config.ts, token should be loaded like:
const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error('DISCORD_TOKEN environment variable is required');
}
```

---

#### ☑️ Check 9: Listeners are Registered

Check `discord.module.ts`:
```bash
cat src/discord/discord.module.ts | grep -A5 "providers:"
```

**Should include**:
```typescript
providers: [
  // Commands
  UserCommands,
  EconomyCommands,
  TradeCommands,
  AuctionCommands,
  NoteCommands,
  // Listeners
  ReadyListener,    // ← This is critical
  ErrorListener,
],
```

---

### **Level 5: Process & Runtime Issues**

#### ☑️ Check 10: Check for Runtime Errors

**Stop bot and restart with full logging**:
```bash
# Stop current instance
pkill -f "nest start"

# Start with verbose logging
NODE_ENV=development yarn dev 2>&1 | tee bot-debug.log
```

**Watch for**:
- ✅ "NecordModule dependencies initialized"
- ✅ "Discord bot logged in as YourBot#1234!"
- ✅ "ReadyListener" logs
- ❌ Any ERROR or WARN messages

**Let it run for 30 seconds**, then check:
```bash
cat bot-debug.log | grep -E "(Ready|logged in|ERROR|WARN|Exception)"
```

---

#### ☑️ Check 11: PostgreSQL Connection
```bash
docker-compose ps
```

**Expected**: postgres shows "healthy"

**If unhealthy or not running**:
```bash
docker-compose up -d postgres
sleep 10
docker-compose ps
```

---

#### ☑️ Check 12: Database Accessibility
```bash
docker exec -it everreach-postgres psql -U everreach -d everreach_db -c "SELECT 1;"
```

**Expected**: Returns `1`

**If fails**:
```bash
# Restart PostgreSQL
docker-compose restart postgres
sleep 5
```

---

## 🚨 **Common Issues & Fixes**

### Issue 1: Bot Process Running But Not Connecting

**Symptoms**:
- ✅ Process shows in `ps aux`
- ❌ No "logged in" message in logs
- ❌ Bot offline in Discord

**Likely Causes**:
1. Invalid Discord token
2. Missing gateway intents
3. Network/firewall issue

**Fix**:
```bash
# 1. Stop bot
pkill -f "nest start"

# 2. Verify token
cat .env | grep DISCORD_TOKEN
# Token should start with MT and be ~70 characters

# 3. Restart bot
yarn dev

# 4. Watch logs for "logged in as" message
# Should appear within 5 seconds
```

---

### Issue 2: "Invalid Token" Error

**Symptoms**:
- Error in logs: "Invalid token" or "401 Unauthorized"

**Fix**:
1. Go to https://discord.com/developers/applications
2. Select your application
3. Bot → Token → **"Reset Token"**
4. Copy the new token
5. Update `.env`:
   ```bash
   nano .env
   # Replace DISCORD_TOKEN value
   ```
6. Restart bot

---

### Issue 3: "Disallowed Intents" Error

**Symptoms**:
- Error about privileged intents

**Fix**:
1. Go to Discord Developer Portal
2. Bot → Privileged Gateway Intents
3. Enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. **Save Changes**
5. Restart bot

---

### Issue 4: Ready Event Not Firing

**Symptoms**:
- Modules load successfully
- But no "logged in as" message
- No ReadyListener logs

**Possible cause**: Listener not registered

**Fix**:
```bash
# Check discord.module.ts includes ReadyListener
cat src/discord/discord.module.ts | grep ReadyListener

# Should see:
# import { ReadyListener } from './listeners/ready.listener';
# and in providers array
```

**If missing**, add to `discord.module.ts`:
```typescript
import { ReadyListener } from './listeners/ready.listener';

providers: [
  // ... other providers
  ReadyListener,  // Add this
  ErrorListener,
],
```

---

### Issue 5: Commands Not Auto-Registering

**Symptoms**:
- Bot connects
- But commands don't appear in Discord

**Check**:
```bash
# Commands should be in providers
cat src/discord/discord.module.ts | grep -E "(UserCommands|EconomyCommands|TradeCommands)"
```

**Fix**: Make sure all command classes are in providers array

---

## 🔧 **Step-by-Step Debug Process**

### Step 1: Stop Everything
```bash
# Stop bot
pkill -f "nest start"

# Verify stopped
ps aux | grep "nest start" | grep -v grep
# Should show nothing
```

### Step 2: Check Configuration
```bash
# Verify .env has all required values
cat .env | grep -E "(DISCORD_TOKEN|DISCORD_CLIENT_ID|GUILD_ID_DEV|DATABASE_URL)"

# All four should have values
```

### Step 3: Check PostgreSQL
```bash
docker-compose ps

# If not running:
docker-compose up -d postgres
sleep 10
```

### Step 4: Start Bot with Logging
```bash
# Start fresh with full logs
yarn dev 2>&1 | tee bot-full.log
```

**Wait 30 seconds**, then in another terminal:
```bash
# Check logs
cat bot-full.log | grep -E "(Ready|logged in|ERROR|Exception|Disallowed)"
```

### Step 5: Analyze Output

**Good signs to look for**:
- ✅ "NecordModule dependencies initialized"
- ✅ "Discord bot logged in as YourBot#1234!"
- ✅ "ReadyListener ✅ Discord bot logged in"
- ✅ No ERROR messages

**Bad signs**:
- ❌ "Invalid token"
- ❌ "401 Unauthorized"
- ❌ "Disallowed intents"
- ❌ "Connection refused"
- ❌ Any Exception stack traces

---

## 🎯 **Quick Fixes**

### Quick Fix 1: Token Issues
```bash
# This is the most common issue!

# 1. Reset token in Discord Developer Portal
# 2. Update .env with new token (no spaces, no quotes)
# 3. Restart
pkill -f "nest start"
yarn dev
```

### Quick Fix 2: Intents Missing
```bash
# Enable in Discord Developer Portal:
# Bot → Privileged Gateway Intents
# ✅ Server Members Intent
# ✅ Message Content Intent
# Save Changes
# Then restart bot
```

### Quick Fix 3: Re-invite Bot
```bash
# Sometimes bot needs to be re-invited

# 1. Go to Developer Portal
# 2. OAuth2 → URL Generator
# 3. Select: bot + applications.commands
# 4. Copy URL and open in browser
# 5. Select server and authorize
# 6. Restart bot
```

### Quick Fix 4: Rebuild Everything
```bash
# Nuclear option - rebuild from scratch

# 1. Stop bot
pkill -f "nest start"

# 2. Clean build
rm -rf dist node_modules/.cache

# 3. Rebuild
yarn build

# 4. Regenerate Prisma
yarn prisma:generate

# 5. Start fresh
yarn dev
```

---

## 📊 **Diagnostic Commands**

Run these to get complete diagnostic info:

```bash
# Full diagnostic report
echo "=== Process Status ===" && \
ps aux | grep "nest start" | grep -v grep && \
echo -e "\n=== Docker Status ===" && \
docker-compose ps && \
echo -e "\n=== Environment Check ===" && \
cat .env | grep -E "(DISCORD_TOKEN|CLIENT_ID|GUILD_ID)" | sed 's/=.*/=***HIDDEN***/' && \
echo -e "\n=== Build Status ===" && \
yarn build 2>&1 | tail -5 && \
echo -e "\n=== Recent Logs ===" && \
tail -30 /tmp/necord-start.log 2>/dev/null || tail -30 bot-debug.log 2>/dev/null || echo "No logs found"
```

Save output and review for errors.

---

## 🆘 **Emergency Recovery**

### If Nothing Works: Rollback to Working State

#### Option A: Restart PostgreSQL & Bot
```bash
# Stop everything
pkill -f "nest start"
docker-compose down

# Start fresh
docker-compose up -d postgres
sleep 15
yarn prisma:generate
yarn dev
```

#### Option B: Check for Port Conflicts
```bash
# Check if something else is using Discord API
lsof -i :443 | grep node

# Kill any conflicting processes
pkill -f node
yarn dev
```

---

## 🐛 **Known Issues & Solutions**

### Issue: "Cannot find module 'necord'"
**Fix**:
```bash
yarn install
yarn build
yarn dev
```

### Issue: Prisma Client Not Generated
**Fix**:
```bash
yarn prisma:generate
yarn build
yarn dev
```

### Issue: Database Connection Error
**Fix**:
```bash
# Check PostgreSQL
docker-compose logs postgres | tail -20

# Restart if needed
docker-compose restart postgres
sleep 10
yarn dev
```

### Issue: Token Expired/Invalid
**Fix**: Reset token in Discord Developer Portal (see Quick Fix 1)

---

## 📝 **Checklist to Run Through**

### Environment Configuration
- [ ] `.env` file exists in project root
- [ ] `DISCORD_TOKEN` is set and starts with `MT`
- [ ] `DISCORD_CLIENT_ID` is set (numeric, 18-19 digits)
- [ ] `GUILD_ID_DEV` is set (numeric, 18-19 digits)
- [ ] `DATABASE_URL` points to PostgreSQL
- [ ] No extra spaces or quotes around values

### Discord Developer Portal
- [ ] Bot exists in application
- [ ] Bot token is valid (not reset recently without updating .env)
- [ ] Server Members Intent is enabled
- [ ] Message Content Intent is enabled
- [ ] Bot is invited to server with `bot` + `applications.commands` scopes
- [ ] Bot has permissions: Send Messages, Use Slash Commands

### Infrastructure
- [ ] PostgreSQL container is running (`docker-compose ps`)
- [ ] PostgreSQL is healthy
- [ ] Database migrations applied (`yarn prisma:migrate`)
- [ ] No port conflicts

### Code
- [ ] `yarn build` succeeds
- [ ] `yarn lint` shows 0 errors
- [ ] All Necord files created correctly
- [ ] discord.module.ts imports NecordModule
- [ ] Listeners are in providers array

### Bot Process
- [ ] Bot process is running (`ps aux | grep nest`)
- [ ] No crash errors in logs
- [ ] Modules load successfully
- [ ] Ready event should fire within 10 seconds

---

## 🔬 **Deep Dive: Check Necord Connection**

### View Full Startup Sequence
```bash
# Stop bot
pkill -f "nest start"

# Start with debug output
DEBUG=* yarn dev 2>&1 | tee necord-debug.log
```

**What to look for** (in order):
1. ✅ "Starting Nest application"
2. ✅ "NecordModule dependencies initialized"
3. ✅ "CommandsModule dependencies initialized"
4. ✅ "ListenersModule dependencies initialized"
5. ✅ "DiscordModule dependencies initialized"
6. ✅ "Bootstrap] 🚀 EverReach Assistant Discord Bot starting"
7. ✅ **"Discord bot logged in as YourBot#1234!"** ← CRITICAL
8. ✅ "ReadyListener ✅ Discord bot logged in"

**If it stops before step 7**:
- Token is invalid
- Intents are missing
- Network issue

---

## 🔍 **Check Specific Error Messages**

### Error: "Privileged intent provided is not enabled"
**Fix**: Enable intents in Discord Developer Portal (see Check 4)

### Error: "Invalid token"  
**Fix**: Reset token (see Check 1)

### Error: "Cannot find module"
**Fix**:
```bash
rm -rf node_modules
yarn install
yarn build
```

### Error: "Database connection failed"
**Fix**:
```bash
docker-compose up -d postgres
sleep 10
yarn prisma:migrate
```

### No Error, Just Stops/Hangs
**Possible causes**:
1. Network firewall blocking Discord
2. DNS resolution issue
3. Token validation taking too long

**Fix**:
```bash
# Test internet connectivity
curl https://discord.com/api/v10/gateway

# Should return JSON with {"url":"wss://gateway.discord.gg"}

# If fails, check your internet/firewall
```

---

## 🎯 **Most Likely Issues (Ordered by Probability)**

1. **Invalid/Expired Token** (70% of cases)
   - Fix: Reset token in Developer Portal

2. **Missing Intents** (15% of cases)
   - Fix: Enable in Developer Portal

3. **Bot Not Invited Correctly** (10% of cases)
   - Fix: Re-invite with correct scopes

4. **Environment Variables Wrong** (3% of cases)
   - Fix: Double-check .env values

5. **Code/Build Issue** (2% of cases)
   - Fix: Rebuild with `yarn build`

---

## 💡 **Quick Test: Minimal Bot**

To isolate if it's a Necord configuration issue:

Create `test-bot.js`:
```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log('✅ TEST BOT CONNECTED!');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ TEST BOT FAILED:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ TEST BOT TIMEOUT');
  process.exit(1);
}, 15000);
```

Run:
```bash
node test-bot.js
```

- ✅ If succeeds: Issue is in Necord configuration
- ❌ If fails: Issue is with token/intents/network

---

## 📞 **Get Help**

If you've tried everything:

1. **Share these outputs**:
   ```bash
   # Create diagnostic bundle
   yarn build > build-output.txt 2>&1
   tail -100 /tmp/necord-start.log > logs.txt
   cat .env | sed 's/=.*/=***HIDDEN***/' > env-check.txt
   docker-compose ps > docker-status.txt
   ```

2. **What to share**:
   - `build-output.txt`
   - `logs.txt`
   - First ERROR message you see
   - Whether test-bot.js worked

---

## ✅ **Success Indicators**

You'll know it's working when you see:

### In Terminal:
```
[Nest] ... LOG [InstanceLoader] NecordModule dependencies initialized ✅
[Nest] ... LOG [InstanceLoader] ListenersModule dependencies initialized ✅
[Nest] ... LOG [ReadyListener] ✅ Discord bot logged in as YourBot#1234! ✅
```

### In Discord:
```
✅ Bot shows ONLINE (green dot)
✅ Bot appears in member list
✅ Typing / shows commands
```

---

## 🎯 **Recommended Action Plan**

**Run these in order**:

```bash
# 1. Stop bot
pkill -f "nest start"

# 2. Verify PostgreSQL
docker-compose ps

# 3. Check .env
cat .env | grep DISCORD_TOKEN | cut -c1-30
# Should start with DISCORD_TOKEN=MT...

# 4. Rebuild
yarn build

# 5. Start with visible output
yarn dev
```

**Watch for**: "logged in as" message within 10 seconds

**If you don't see it**: Token is invalid or intents are missing.

---

**Start with the checklist above and let me know what you find!**

