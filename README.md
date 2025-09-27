# EverReach Assistant - Discord Bot for West Marches

A production-ready Discord bot built with NestJS and TypeScript for managing a West Marches D&D group (≤10 users). Features character management, economy system, trading, auctions, and personal notes with vector search.

## Features

### Core Economy
- **Character Registration**: `/register <name>` - Create and manage characters
- **Inventory Management**: `/inv` - View character inventory and gold
- **Shop System**: `/shop` - Browse available items, `/buy <item> <qty>` - Purchase items
- **Transaction History**: `/history` - View last 10 transactions

### Trading System
- **Atomic Swaps**: `/trade start @user` - Start trade, `/trade add <type> <key?> <qty>` - Add offers
- **Trade Management**: `/trade show` - View pending trade, `/trade accept` - Execute atomic swap
- **ACID Transactions**: All trades are processed atomically with rollback on failure

### Auction System
- **Timed Auctions**: `/auction create <item> <qty> <min_bid> <minutes>` - Create auctions
- **Bidding**: `/auction bid <id> <amount>` - Place bids, `/auction list` - View active auctions
- **Auto-Settlement**: Heartbeat system automatically settles expired auctions
- **User Dashboard**: `/auction my` - View your auctions and bids

### Personal Notes
- **Vector Search**: `/note add <text>` - Add notes, `/note search <query>` - Semantic search
- **In-Memory Embeddings**: Fast cosine similarity search over personal notes
- **Fallback Support**: Works without external API using hash-based embeddings

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS (single process, no HTTP API)
- **Discord**: discord.js v14 with slash commands
- **Database**: Prisma ORM + SQLite (file-based)
- **Deployment**: PM2 process manager
- **Testing**: Jest + ts-jest
- **Code Quality**: ESLint + Prettier

## Architecture

- **Single Process**: Bot handles frontend + backend in one process
- **ACID Transactions**: All state changes use Prisma transactions
- **No External Dependencies**: No Redis, queues, or Kubernetes required
- **Optional Vector Search**: In-memory embeddings for personal notes

## Prerequisites

Before starting, ensure you have:

- **Node.js 20 LTS** or later installed (for development)
- **Docker & Docker Compose** (recommended for production) - or -
- **PM2** (optional, for production deployment): `yarn global add pm2`
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
- **Discord Application ID** (same as Discord Client ID)
- **Development Guild ID** for testing commands during development

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd everreach-assistant
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Required: Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id_here
GUILD_ID_DEV=your_development_guild_id_here

# Required: Database Configuration
DATABASE_URL="file:./data/database.db"

# Optional: Enhanced Embeddings (for better note search)
EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_API_KEY=your_openai_api_key_here

# Optional: Environment
NODE_ENV=development
```

#### Getting Discord Credentials

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Copy the **Application ID** → `DISCORD_CLIENT_ID`

2. **Create Bot Token**:
   - In your application, go to "Bot" section
   - Click "Add Bot" → "Yes, do it!"
   - Copy the **Token** → `DISCORD_TOKEN`
   - Enable necessary intents (Server Members, Message Content)

3. **Get Guild ID**:
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your development server → Copy ID → `GUILD_ID_DEV`

### 3. Database Setup

The bot uses SQLite with Prisma ORM. Set up the database:

```bash
# Generate Prisma client
yarn prisma:generate

# Run database migrations (creates tables)
yarn prisma:migrate

# Seed initial shop items from data/items.json
yarn prisma:seed
```

This will:
- Create SQLite database at `./data/database.db`
- Set up all required tables (Users, Characters, Items, etc.)
- Populate the shop with 10 initial items (potions, weapons, armor, etc.)

#### Alternative: Docker Setup

If you prefer using Docker (recommended for production):

```bash
# Create .env file (see Environment Configuration section)
cp .env.example .env
nano .env

# Build and start with Docker Compose
docker-compose up -d --build

# Check if container is running
docker-compose ps

# View logs
docker-compose logs -f everreach-bot
```

This will:
- Build the Docker image with all dependencies
- Create and mount persistent volumes for database and logs
- Start the bot with proper environment variables
- Enable health checks and restart policies

### 4. Verify Setup

Test that everything is working:

```bash
# Check database connection
yarn prisma:studio

# Run tests to verify functionality
yarn test
```

## Development

### Starting the Bot

```bash
# Development mode (with hot reload)
yarn dev

# Debug mode (with inspector)
yarn start:debug
```

The bot will:
1. Connect to Discord
2. Register slash commands for your development guild
3. Start listening for commands
4. Create database connection

### Available Commands

Once running, you can use these commands in Discord:

#### Basic Economy
- `/register <name>` - Create your character
- `/inv` - View your inventory and gold
- `/shop` - Browse available items
- `/buy <item> <quantity>` - Purchase items
- `/history` - View transaction history

#### Trading
- `/trade start @user` - Start a trade with another user
- `/trade add <type> <key?> <qty>` - Add items/gold to trade
- `/trade show` - View current trade
- `/trade accept` - Execute trade

#### Auctions
- `/auction list` - View active auctions
- `/auction create <item> <qty> <min_bid> <minutes>` - Create auction
- `/auction bid <id> <amount>` - Place bid
- `/auction my` - View your auctions/bids

#### Notes
- `/note add <text>` - Add personal note
- `/note search <query>` - Search your notes

## Production Deployment

### Building for Production

```bash
# Build the application
yarn build

# Verify build
ls -la dist/
```

### Production Deployment Options

#### Option 1: Docker (Recommended)

The easiest way to deploy the bot with all dependencies:

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your Discord credentials
nano .env

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f everreach-bot

# Monitor the container
docker-compose ps

# Restart if needed
docker-compose restart

# Stop the bot
docker-compose down
```

#### Option 2: PM2 (Traditional)

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor the bot
pm2 monit

# View logs
pm2 logs everreach-assistant

# Restart if needed
pm2 restart everreach-assistant
```

#### Option 3: Direct Node.js

```bash
# Start directly
NODE_ENV=production yarn start:prod
```

#### Option 4: Process Manager

```bash
# Using forever (if PM2 not available)
yarn global add forever
forever start dist/main.js

# Or using systemd (Linux servers)
sudo cp ecosystem.config.js /etc/systemd/system/everreach-assistant.service
sudo systemctl enable everreach-assistant
sudo systemctl start everreach-assistant
```

### Production Environment Variables

For production, ensure these are set:

```env
NODE_ENV=production
DISCORD_TOKEN=your_production_bot_token
DISCORD_CLIENT_ID=your_application_id
GUILD_ID_PROD=your_production_guild_id
DATABASE_URL="file:./data/database.db"
```

### Production Checklist

- [ ] Update `GUILD_ID_DEV` to production guild ID
- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure proper logging (PM2 handles this)
- [ ] Set up database backups
- [ ] Configure bot permissions in production guild
- [ ] Test all commands in production environment

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run with coverage report
yarn test:cov

# Run specific test file
yarn test economy.service.spec.ts

# Watch mode for development
yarn test:watch

# E2E tests
yarn test:e2e
```

### Test Coverage

The test suite covers:
- Economy service operations (buy/sell)
- Trade atomic swaps
- Notes vector similarity
- Error handling and edge cases
- Database transactions

## Troubleshooting

### Common Issues

#### 1. "Discord bot is offline"
```bash
# Check if bot is running
pm2 status

# Check logs
pm2 logs everreach-assistant

# Verify Discord token is correct
# Check if bot is added to your server
```

#### 2. "Commands not registering"
```bash
# Check if GUILD_ID_DEV is correct
# Verify bot has applications.commands scope
# Check Discord Developer Portal permissions
```

#### 3. "Database connection failed"
```bash
# Check if database file exists
ls -la data/database.db

# Check file permissions
chmod 644 data/database.db

# Verify DATABASE_URL in .env
```

#### 4. "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install

# Clear Prisma client
rm -rf node_modules/.prisma
yarn prisma:generate
```

#### 5. "Port already in use"
```bash
# Kill process using the port
npx kill-port 3000

# Or find and kill the process
lsof -ti:3000 | xargs kill
```

### Debug Mode

For detailed debugging:

```bash
# Start with debug logging
DEBUG=* yarn dev

# Or use Node.js inspector
yarn start:debug
```

### Logs Location

- **PM2 logs**: `./logs/` directory
- **Application logs**: Check PM2 logs with `pm2 logs`
- **Database logs**: SQLite doesn't log, but Prisma will show connection issues

## Configuration

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application ID |
| `GUILD_ID_DEV` | Yes | Development guild for command testing |
| `GUILD_ID_PROD` | No | Production guild ID |
| `DATABASE_URL` | Yes | SQLite database file path |
| `EMBEDDING_API_URL` | No | OpenAI embeddings API endpoint |
| `EMBEDDING_API_KEY` | No | OpenAI API key for embeddings |
| `NODE_ENV` | No | Environment (development/production) |

### Bot Permissions

Ensure your Discord bot has these permissions:
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History
- Mention Everyone (optional)

### Database Schema

The bot uses these main entities:
- **Users**: Discord users per guild
- **Characters**: Player characters with inventory
- **Items**: Shop catalog items
- **Trades**: Pending atomic swaps
- **Auctions**: Timed bidding system
- **Notes**: Personal notes with embeddings
- **Transaction Logs**: Audit trail

## Performance & Monitoring

### Resource Usage
- **Memory**: ~50-100MB RAM
- **CPU**: Minimal usage during idle
- **Storage**: SQLite database grows with usage
- **Network**: Discord WebSocket + API calls

### Monitoring

```bash
# Monitor with PM2
pm2 monit

# Check resource usage
pm2 show everreach-assistant

# Set up alerts (optional)
# Configure log rotation in ecosystem.config.js
```

### Backup Strategy

```bash
# Backup database
cp data/database.db data/database.db.backup

# Backup entire project
tar -czf everreach-backup-$(date +%Y%m%d).tar.gz ./
```

## Support & Development

### Getting Help

1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs everreach-assistant`
3. Check Discord Developer Portal for bot status
4. Verify all environment variables are set correctly

### Development Workflow

1. Make changes in development guild first
2. Test all commands thoroughly
3. Update production only after testing
4. Keep database backups before migrations
5. Use feature branches for new functionality

### Contributing

1. Follow existing code style (ESLint + Prettier)
2. Write tests for new features
3. Test with development guild first
4. Update documentation for new commands
5. Submit PR with clear description

## Database Schema

The bot uses SQLite with the following key models:

- **User**: Discord users per guild
- **Character**: Player characters with gold and inventory
- **Item**: Shop catalog items
- **Trade**: Pending trades with atomic swap support
- **Auction**: Timed auctions with automatic settlement
- **Note**: Personal notes with optional embeddings

## Command Reference

### Basic Commands
- `/register <name>` - Register a character
- `/inv` - View inventory
- `/shop` - Browse shop
- `/buy <item> <qty>` - Buy items
- `/history` - Transaction history

### Trading
- `/trade start @user` - Start trade
- `/trade add <type> <key?> <qty>` - Add to trade
- `/trade show` - Show pending trade
- `/trade accept` - Accept trade

### Auctions
- `/auction list` - List active auctions
- `/auction create <item> <qty> <min_bid> <minutes>` - Create auction
- `/auction bid <id> <amount>` - Place bid
- `/auction my` - Your auctions/bids

### Notes
- `/note add <text>` - Add personal note
- `/note search <query>` - Search notes

## Testing

The project includes comprehensive unit tests for core services:

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:cov

# Run specific test file
yarn test economy.service.spec.ts
```

Key test coverage:
- Economy service buy/sell operations
- Trade service atomic swaps
- Notes service vector similarity
- Error handling and edge cases

## Deployment

### PM2 Configuration

The project includes `ecosystem.config.js` for PM2 deployment:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor logs
pm2 logs everreach-assistant

# Restart
pm2 restart everreach-assistant
```

### Environment Variables

Production requires:
- `NODE_ENV=production`
- Valid Discord bot token
- Guild ID for command registration
- Database file permissions

## Development

### Project Structure

```
src/
├── discord/          # Discord integration
│   ├── commands/     # Slash command handlers
│   ├── discord.client.ts
│   └── discord.service.ts
├── db/               # Database layer
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── economy/          # Shop and economy
├── users/            # User management
├── trade/            # Trading system
├── auction/          # Auction system
├── notes/            # Notes with embeddings
└── main.ts           # Application entry
```

### Key Design Decisions

1. **Single Process**: No HTTP server, Discord bot handles everything
2. **ACID Transactions**: All state changes are transactional
3. **In-Memory Search**: Fast vector search without external services
4. **Guild-Scoped**: Commands work per Discord guild
5. **Atomic Swaps**: Trades are all-or-nothing operations

## Contributing

1. Follow existing code style (ESLint + Prettier)
2. Write tests for new features
3. Use TypeScript strict mode
4. Document new commands in README
5. Test with development guild first

## License

MIT License - see LICENSE file for details.