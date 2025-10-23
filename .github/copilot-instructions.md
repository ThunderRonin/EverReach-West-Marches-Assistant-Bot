# EverReach Assistant - AI Coding Agent Instructions

## Project Overview
NestJS Discord bot for West Marches D&D campaign management with economy, trading, auctions, and notes system. Built with PostgreSQL (Prisma ORM), discord.js v14, and Necord framework.

## Architecture Essentials

### Core Pattern: Service-First Design
All business logic lives in services (`src/*/*.service.ts`), not command handlers. Commands are thin wrappers:
```typescript
// ✅ Good: Delegate to service
@SlashCommand({ name: 'buy' })
async buy(@Context() [interaction]: [CommandInteraction], @Options() dto: BuyDto) {
  const result = await this.economyService.buyItem(charId, itemKey, qty);
  // Present result...
}

// ❌ Bad: Business logic in command
@SlashCommand({ name: 'buy' })
async buy() {
  const gold = await this.prisma.character.findUnique(...);
  if (gold < cost) throw new Error(...); // Should be in service
}
```

### Error Handling: Domain-Driven Pattern
**Never use generic errors or try-catch in command handlers**. All business errors extend `DomainError` (`src/core/errors/errors.ts`):
```typescript
// In services:
if (character.gold < totalCost) {
  throw new InsufficientGoldError(); // Caught by DomainErrorFilter
}

// DomainErrorFilter automatically converts to Discord embeds with ⚠️ emoji
```

Existing domain errors: `ItemNotFoundError`, `InsufficientGoldError`, `CharacterNotFoundError`, `AuctionNotOpenError`, `BidTooLowError`, `InsufficientItemsError`.

### Discord Commands: Necord Pattern
Use Necord decorators for command structure:
```typescript
// Grouped commands (e.g., /admin item-add)
const AdminCommand = createCommandGroupDecorator({
  name: 'admin',
  description: 'Admin commands (DM only)',
});

@Injectable()
@AdminCommand()
export class AdminCommands {
  @Subcommand({ name: 'item-add', description: '...' })
  async onItemAdd(@Context() [interaction], @Options() dto: ItemCreateDto) {}
}

// Single commands (e.g., /shop)
@Injectable()
export class EconomyCommands {
  @SlashCommand({ name: 'shop', description: '...' })
  async shop(@Context() [interaction]: [CommandInteraction]) {}
}
```

DTOs use `class-validator` decorators AND Necord option decorators:
```typescript
export class BuyDto {
  @StringOption({ name: 'item', description: '...', required: true })
  @IsString()
  @Length(1, 50)
  itemKey: string;

  @IntegerOption({ name: 'qty', description: '...', min_value: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}
```

## Prisma Database Patterns

### Transaction Pattern
**Always wrap multi-step operations in `$transaction`**:
```typescript
return this.prisma.$transaction(async (tx) => {
  const character = await tx.character.findUnique({ where: { id } });
  await tx.character.update({ where: { id }, data: { gold: { decrement: cost } } });
  await tx.inventory.upsert(...);
  await tx.txLog.create({ data: { type: 'BUY', payload: JSON.stringify(...) } });
  return result;
});
```

### Performance: Avoid N+1 Queries
```typescript
// ✅ Good: Single query with updateMany
await tx.trade.updateMany({
  where: { status: 'PENDING', expiresAt: { lt: now } },
  data: { status: 'EXPIRED' }
});

// ❌ Bad: N+1 pattern
for (const trade of expiredTrades) {
  await tx.trade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
}
```

### Relation Loading
Use `include` for related data to avoid multiple queries:
```typescript
const character = await tx.character.findUnique({
  where: { id },
  include: {
    inventory: { include: { item: true } },
    user: true
  }
});
```

## Authorization & Guards

### DungeonMasterGuard
Protects admin commands (`@UseGuards(DungeonMasterGuard)`). Checks bot owner in DMs, or "Dungeon Master" role in guilds. Automatically sends permission denied embeds.

### RateLimitGuard
Command-level rate limiting configured in `src/config/rate-limit.config.ts`. Three tiers: STRICT (3/min), STANDARD (10/min), RELAXED (30/min). Applied via `@UseGuards(RateLimitGuard)`.

## Validation Strategy

### Runtime Validation: Zod Schemas
JSON payloads (trades, auctions) use Zod schemas in `src/config/validation.schemas.ts`:
```typescript
const validated = CreateTradeSchema.parse({ fromCharId, toCharId });
// Throws ZodError if invalid - caught by global filter
```

### Input Sanitization
Use `sanitization.util.ts` for untrusted inputs:
```typescript
import { validateInteger, sanitizeString } from '../common/sanitization.util';
validateInteger(tradeId, 1); // min value
sanitizeString(input); // XSS protection
```

## Testing Patterns

### Service Tests
Mock PrismaService in `*.spec.ts` files:
```typescript
const mockPrisma = {
  character: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

// Test isolation: reset mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});
```

### E2E Tests
Located in `test/*.e2e-spec.ts`. Use actual database with test data.

## Common Workflows

### Adding New Commands
1. Create DTO class with validators in command file
2. Add service method in relevant `*.service.ts`
3. Add command handler using `@SlashCommand` or `@Subcommand`
4. Test manually with `/command` in Discord dev guild
5. Add unit tests for service method

### Adding Database Fields
1. Update `prisma/schema.prisma`
2. Run `yarn prisma:migrate` (creates migration)
3. Update TypeScript types (auto-generated by Prisma)
4. Update affected services/queries
5. Test with `yarn prisma:studio`

### Deployment Commands
```bash
# Local development
yarn dev               # Watch mode with hot reload

# Build & test
yarn build            # Compile TypeScript to dist/
yarn lint             # ESLint check (must pass with 0 errors)
yarn test             # Run Jest test suite

# Database
yarn prisma:generate  # Generate Prisma client
yarn prisma:migrate   # Run migrations
yarn prisma:studio    # Database GUI

# Production
docker-compose up -d  # Recommended: PostgreSQL + bot
pm2 start ecosystem.config.js  # Alternative: PM2 process manager
```

### Environment Variables
Required: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID_DEV`, `DATABASE_URL`  
Optional: `EMBEDDING_API_URL`, `EMBEDDING_API_KEY` (for notes vector search)

## Project-Specific Conventions

### Logging
Use NestJS Logger, not console.log:
```typescript
private readonly logger = new Logger(ServiceName.name);
this.logger.log(`Trade ${id} accepted`);
this.logger.error('Failed to process', error);
```

### Discord Embeds
Consistent formatting with emojis:
- ✅ Success: `#00ff00` green
- ❌ Error: `#ff0000` red (automatic via DomainErrorFilter)
- 📋 Info: `#0099ff` blue
- ⚠️ Warning: `#ffaa00` orange

### Database Indexes
Schema includes 10 performance indexes (see `prisma/schema.prisma` comments). Maintain index coverage for:
- `@@index([charId, createdAt(sort: Desc)])` for history queries
- `@@index([status, expiresAt])` for cleanup jobs
- `@@index([userId, createdAt(sort: Desc)])` for user-scoped data

### Transaction Log Pattern
All state changes log to `TxLog` table with JSON payloads:
```typescript
await tx.txLog.create({
  data: {
    charId: id,
    type: 'BUY', // BUY | TRADE | AUCTION_SALE | AUCTION_REFUND | GRANT
    payload: JSON.stringify({ itemId, quantity, totalCost }),
  }
});
```

## Known Patterns to Preserve

### Notes Service: In-Memory Cache
Notes service loads all user notes into memory for fast cosine similarity search. This is intentional for ≤10 users scope.

### Auction Heartbeat: Scheduled Task
`@Cron('*/30 * * * * *')` in `auction.service.ts` settles expired auctions every 30 seconds. Uses `updateMany` for performance.

### Trade Cleanup: Cron Pattern
Expired trades auto-cancel via scheduled cleanup job. Do not add manual cleanup to command handlers.

### Guild-Scoped Data
All data is per-guild (`guildId` in User model). Commands use `interaction.guildId` for isolation.

## What NOT to Do

❌ Add try-catch in command handlers (use domain errors)  
❌ Put business logic in command files (belongs in services)  
❌ Use console.log (use Logger)  
❌ Create markdown docs after every task.
❌ Create database queries outside $transaction for multi-step operations  
❌ Forget to run `prisma:generate` after schema changes  
❌ Use `any` type (strict TypeScript mode enabled)  
❌ Skip validation - always validate untrusted input  
❌ Add dependencies without updating package.json (use `yarn add`)

## Key Files for Context

- `src/app.module.ts` - Module structure and dependencies
- `src/core/errors/` - Error handling system
- `src/config/*.config.ts` - Configuration constants
- `prisma/schema.prisma` - Database schema and indexes
- `docs/PROJECT_SUMMARY.md` - Architectural decisions and history
