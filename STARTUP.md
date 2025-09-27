# EverReach Assistant - Quick Start Guide

This is a streamlined startup guide for the EverReach Discord bot. For detailed documentation, see [README.md](README.md).

## 🚀 Quick Start (Docker - Recommended)

### 1. Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create "New Application" → Copy **Application ID**
3. Go to "Bot" section → "Add Bot" → Copy **Token**
4. Enable Developer Mode in Discord → Right-click server → Copy **Guild ID**

### 2. Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd everreach-assistant

# Create environment file
cat > .env << EOF
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
GUILD_ID_DEV=your_guild_id_here
DATABASE_URL="file:./data/database.db"
NODE_ENV=production
EOF
```

### 3. Start with Docker

```bash
# Build and start (first time)
docker-compose up -d --build

# Check status
docker-compose ps

# View logs (follow for real-time updates)
docker-compose logs -f everreach-bot

# Restart if needed
docker-compose restart
```

### 4. Test the Bot

1. Add the bot to your Discord server
2. Run `/register <character_name>` to create your character
3. Try `/shop` to see available items
4. Test `/buy health_potion 1` to make a purchase

## 🛠️ Development Setup

### Prerequisites
- Node.js 20 LTS
- Discord Bot Token (from above)

### Setup
```bash
# Install dependencies
yarn install

# Setup database
yarn prisma:generate
yarn prisma:migrate
yarn prisma:seed

# Start development server
yarn dev
```

## 📦 What's Included

### Available Commands
- **Character**: `/register <name>`, `/inv`
- **Shop**: `/shop`, `/buy <item> <qty>`, `/history`
- **Trading**: `/trade start @user`, `/trade add`, `/trade accept`
- **Auctions**: `/auction create/list/bid/my`
- **Notes**: `/note add <text>`, `/note search <query>`

### Shop Items
- Health Potion (25g), Mana Potion (30g)
- Iron Sword (100g), Steel Armor (200g)
- Leather Boots (50g), Magic Ring (150g)
- Fireball Scroll (75g), Rope (10g), Torch (5g), Rations (15g)

## 🔧 Troubleshooting

### Bot Not Responding
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs everreach-bot

# Restart container
docker-compose restart
```

### Commands Not Registering
- Verify `GUILD_ID_DEV` is correct
- Check bot has proper permissions
- Restart container after guild ID changes

### Database Issues
- Database is stored in `./data/database.db`
- Backups are automatically created
- Container has persistent volume mounted

## 🔒 Security Notes

- Bot runs as non-root user in Docker
- Environment variables are not logged
- Database file has proper permissions
- No external database dependencies

## 📊 Monitoring

```bash
# Real-time logs
docker-compose logs -f

# Container resource usage
docker stats

# Health check
curl http://localhost:3000/health || echo "No HTTP server"
```

## 🛑 Stopping

```bash
# Stop the bot
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v
```

## 🔄 Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

---

**Need help?** Check the full [README.md](README.md) for detailed documentation, troubleshooting, and advanced configuration options.
