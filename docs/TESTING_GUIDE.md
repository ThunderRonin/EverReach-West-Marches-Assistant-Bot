# Testing Guide - EverReach Assistant

**Date**: October 9, 2025  
**Purpose**: Comprehensive guide for testing the Discord bot

---

## Quick Start

### Run All Tests
```bash
yarn test
```

### Run Tests with Coverage
```bash
yarn test:cov
```

### Run Tests in Watch Mode (development)
```bash
yarn test:watch
```

---

## Testing Methods

### 1. 🧪 Automated Testing (Jest)

#### Run Unit Tests
The project uses Jest for unit testing services.

```bash
# Run all tests
yarn test

# Run tests in watch mode (auto-rerun on changes)
yarn test:watch

# Run with coverage report
yarn test:cov

# Run specific test file
yarn test economy.service.spec.ts

# Run tests matching a pattern
yarn test --testNamePattern="buyItem"

# Debug tests
yarn test:debug
```

#### Existing Test Files
- `src/economy/economy.service.spec.ts` - Economy service tests
- `src/trade/trade.service.spec.ts` - Trade service tests
- `src/notes/notes.service.spec.ts` - Notes service tests
- `test/app.e2e-spec.ts` - End-to-end tests

#### View Coverage Report
After running `yarn test:cov`, open:
```bash
open coverage/lcov-report/index.html
```

---

### 2. 🤖 Manual Discord Bot Testing

#### Prerequisites
1. **Discord Bot Token**: Get from [Discord Developer Portal](https://discord.com/developers/applications)
2. **Test Discord Server**: Create a dedicated server for testing
3. **Environment Variables**: Configure your `.env` file

#### Setup Environment

Create a `.env` file in the project root:

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID_DEV=your_test_guild_id_here

# Database (SQLite for local development)
DATABASE_URL="file:./prisma/data/database.db"

# Optional: AI Embeddings (for notes feature)
EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_API_KEY=your_openai_key_here

# Environment
NODE_ENV=development
```

#### Initial Database Setup

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate

# (Optional) Seed test data
yarn prisma:seed
```

#### Start the Bot

```bash
# Development mode (auto-restart on changes)
yarn dev

# Or standard start
yarn start

# Production mode
yarn build
yarn start:prod
```

#### Test Discord Commands

Once the bot is running and invited to your test server:

**Basic Commands:**
```
/register YourName          # Register a character
/inv                        # View inventory
/shop                       # View available items
/buy health_potion 5        # Buy items
/history                    # View transaction history
```

**Trading Commands:**
```
/trade start @username      # Start a trade
/trade add item potion 2    # Add items to trade
/trade add gold 100         # Add gold to trade
/trade show                 # View current trade
/trade accept               # Accept trade (recipient only)
```

**Auction Commands:**
```
/auction create potion 5 100 60    # Create auction (item, qty, min_bid, minutes)
/auction list                       # View active auctions
/auction bid 1 150                 # Place bid (auction_id, amount)
/auction my                        # View your auctions and bids
```

**Notes Commands:**
```
/note add This is my note          # Add a note
/note search keyword               # Search notes
```

---

### 3. 🐳 Docker Testing

#### Using Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

#### Using Docker Directly

```bash
# Build image
docker build -t everreach-assistant .

# Run container
docker run -d \
  --name everreach-bot \
  --env-file .env \
  -v $(pwd)/prisma/data:/app/prisma/data \
  everreach-assistant

# View logs
docker logs -f everreach-bot

# Stop and remove
docker stop everreach-bot
docker rm everreach-bot
```

---

## Test Scenarios

### 🎯 Critical Features to Test

#### 1. User Registration
- [x] Register a new character with `/register`
- [x] Try registering again with same name (should return existing)
- [x] Try registering with different name (should warn)

#### 2. Economy System
- [x] View shop with `/shop`
- [x] Buy item with sufficient gold
- [x] Try to buy with insufficient gold (should fail with error)
- [x] Try to buy non-existent item (should fail with error)
- [x] View inventory after purchase
- [x] Check transaction history

#### 3. Trading System
- [x] Start trade with another user
- [x] Add items to trade offer
- [x] Add gold to trade offer
- [x] View trade details
- [x] Accept trade (as recipient)
- [x] Try to accept with insufficient items/gold (should fail)
- [x] Let trade expire (30 minutes)

#### 4. Auction System
- [x] Create auction with valid item
- [x] Try to create auction without sufficient items (should fail)
- [x] View active auctions
- [x] Place valid bid
- [x] Try to bid on own auction (should fail)
- [x] Try to bid below minimum (should fail)
- [x] Try to bid lower than current bid (should fail)
- [x] Wait for auction to expire and auto-settle
- [x] Check refund for outbid user

#### 5. Notes System
- [x] Add a note
- [x] Search for notes with keywords
- [x] Test semantic search (if embeddings configured)

#### 6. Error Handling
- [x] Verify all error messages are user-friendly
- [x] Check that errors show ⚠️ emoji
- [x] Verify ephemeral messages (only visible to user)

---

## Performance Testing

### Database Query Logging

The bot logs all queries in development mode:

```bash
# Run with DEBUG level
NODE_ENV=development yarn dev

# Watch for slow queries
grep "Duration:" logs/app.log
```

### Load Testing (Optional)

For production deployment:

```bash
# Install Artillery
npm install -g artillery

# Create load test scenario
# (Would need custom Discord API testing setup)
```

---

## Writing New Tests

### Unit Test Template

Create a new test file: `src/your-module/your.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { PrismaService } from '../db/prisma.service';

describe('YourService', () => {
  let service: YourService;
  let prisma: PrismaService;

  const mockPrismaService = {
    // Mock Prisma methods
    $transaction: jest.fn(),
    model: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('yourMethod', () => {
    it('should perform expected action', async () => {
      // Arrange
      mockPrismaService.model.findUnique.mockResolvedValue({ id: 1 });

      // Act
      const result = await service.yourMethod(1);

      // Assert
      expect(result).toBeDefined();
      expect(prisma.model.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error when not found', async () => {
      // Arrange
      mockPrismaService.model.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.yourMethod(1)).rejects.toThrow();
    });
  });
});
```

### Integration Test Template

Create: `test/your-feature.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';

describe('Your Feature (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should perform end-to-end action', async () => {
    // Your test code here
  });
});
```

---

## Test Coverage Goals

### Current Coverage
Run `yarn test:cov` to see current coverage.

### Target Coverage
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Priority Areas for Testing
1. ✅ Services (business logic) - **High Priority**
2. ⚠️ Command handlers - **Medium Priority** (mostly delegation)
3. ⚠️ Filters and interceptors - **Medium Priority**
4. ✅ Critical paths (transactions, payments) - **High Priority**

---

## Debugging Tests

### VSCode Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-cache",
        "--watchAll=false"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Specific Test

```bash
# Set breakpoint in your IDE, then run:
yarn test:debug your.service.spec.ts
```

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: yarn install --frozen-lockfile
      
    - name: Generate Prisma Client
      run: yarn prisma:generate
      
    - name: Run tests
      run: yarn test:cov
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json
```

---

## Common Issues & Solutions

### Issue: Tests timing out
**Solution**: Increase Jest timeout
```typescript
jest.setTimeout(10000); // 10 seconds
```

### Issue: Database locked (SQLite)
**Solution**: Use separate test database
```typescript
// In test setup
process.env.DATABASE_URL = "file:./test/test.db";
```

### Issue: Mock not working
**Solution**: Clear mocks between tests
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### Issue: Discord bot won't start
**Solution**: Check environment variables and bot permissions
```bash
# Verify .env file exists
cat .env

# Check bot has necessary permissions in Discord server
# Required: Send Messages, Read Messages, Use Slash Commands
```

---

## Test Data Management

### Using Prisma Seed

Edit `prisma/seed.ts` to add test data:

```typescript
// Run seed
yarn prisma:seed

// Reset database and seed
yarn prisma:reset
```

### Test Database

For isolated testing, use a separate database:

```bash
# Create test database
cp prisma/data/database.db prisma/data/test.db

# Set in .env.test
DATABASE_URL="file:./prisma/data/test.db"
```

---

## Best Practices

### ✅ Do's
- ✅ Test business logic thoroughly
- ✅ Mock external dependencies (Discord API, databases)
- ✅ Test error cases, not just happy paths
- ✅ Keep tests isolated and independent
- ✅ Use descriptive test names
- ✅ Test domain errors are thrown correctly

### ❌ Don'ts
- ❌ Don't test implementation details
- ❌ Don't make tests dependent on each other
- ❌ Don't test external libraries (Discord.js, Prisma)
- ❌ Don't skip error case testing
- ❌ Don't commit with failing tests

---

## Monitoring in Production

### Health Checks

Add a health check endpoint (optional):

```typescript
// src/health/health.controller.ts
@Get('health')
async check() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

### Discord Bot Status

Monitor bot status in Discord:
- Bot appears online in member list
- Slash commands are registered
- Bot responds to commands

### Database Health

```bash
# Check database size
du -h prisma/data/database.db

# View recent errors
grep "ERROR" logs/*.log

# Monitor query performance (development)
grep "Duration:" logs/*.log | sort -n
```

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Discord.js Guide](https://discordjs.guide/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

### Project Documentation
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Architecture overview
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Implementation details
- [PERFORMANCE.md](./PERFORMANCE.md) - Performance guidelines

---

## Quick Reference

### Common Commands
```bash
# Run tests
yarn test

# Watch mode
yarn test:watch

# Coverage
yarn test:cov

# E2E tests
yarn test:e2e

# Start bot (development)
yarn dev

# Build and start (production)
yarn build
yarn start:prod

# Database
yarn prisma:generate
yarn prisma:migrate
yarn prisma:seed
yarn prisma:studio

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

**Ready to test! 🧪** Start with `yarn test` to run the existing test suite, then try manual testing with the Discord bot.

