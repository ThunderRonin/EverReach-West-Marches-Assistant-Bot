# EverReach Assistant - Complete Implementation Plan

**Date Created**: October 9, 2025  
**Status**: Ready for Implementation  
**Estimated Total Time**: 5-8 hours

---

## Table of Contents

1. [Phase 1: Fix TypeScript Compilation Errors (CRITICAL)](#phase-1-fix-typescript-compilation-errors-critical)
2. [Phase 2: Complete Error Handling Refactoring (HIGH)](#phase-2-complete-error-handling-refactoring-high)
3. [Phase 3: Fix ESLint Errors (MEDIUM)](#phase-3-fix-eslint-errors-medium)
4. [Phase 4: Performance Optimization (LOW)](#phase-4-performance-optimization-low)
5. [Phase 5: Final Verification](#phase-5-final-verification)

---

## Phase 1: Fix TypeScript Compilation Errors (CRITICAL)

**Goal**: Make the project build successfully with `yarn build`  
**Time Estimate**: 30-45 minutes  
**Files to Modify**: 4 files

### 1.1 Fix `src/discord/commands/register.command.ts` (3 errors)

**Problem**: After calling `getUserByDiscordId()`, the `user` variable is possibly `null`, but the code doesn't check before accessing `user.character`.

**Location**: Lines 37-45

**Current Code**:
```typescript
const user = await this.usersService.getUserByDiscordId(discordId, guildId);

// Check if user already has a character with this name
if (user.character) {  // ERROR: user is possibly null
  if (user.character.name === name) {  // ERROR: user is possibly null
    return interaction.reply({
      content: `You already have a character named "${user.character.name}". Use a different name or contact a GM to change it.`,  // ERROR: user is possibly null
      ephemeral: true,
    });
  }
}
```

**Fix**:
```typescript
const user = await this.usersService.getUserByDiscordId(discordId, guildId);

// Check if user exists and already has a character with this name
if (user?.character) {  // Use optional chaining
  if (user.character.name === name) {
    return interaction.reply({
      content: `You already have a character named "${user.character.name}". Use a different name or contact a GM to change it.`,
      ephemeral: true,
    });
  }
}
```

**Action**: Replace lines 37-45 with the fixed code above. The `?.` operator safely checks if `user` exists before accessing `character`.

---

### 1.2 Fix `src/discord/commands/trade-accept.command.ts` (2 errors)

**Problem**: TypeScript infers `parts` array as `never[]` type, preventing string pushes.

**Location**: Lines 107-111

**Current Code**:
```typescript
const buildOfferSummary = (gold: number, items: any[]) => {
  const parts = [];  // TypeScript infers never[]
  if (gold > 0) parts.push(`${gold} gold`);  // ERROR: string not assignable to never
  if (items.length > 0) parts.push(`${items.length} item(s)`);  // ERROR: string not assignable to never
  return parts.length > 0 ? parts.join(', ') : 'Nothing';
};
```

**Fix**:
```typescript
const buildOfferSummary = (gold: number, items: any[]) => {
  const parts: string[] = [];  // Explicitly type as string[]
  if (gold > 0) parts.push(`${gold} gold`);
  if (items.length > 0) parts.push(`${items.length} item(s)`);
  return parts.length > 0 ? parts.join(', ') : 'Nothing';
};
```

**Action**: Add explicit `: string[]` type annotation to the `parts` variable on line 108.

---

### 1.3 Fix `src/discord/commands/trade-add.command.ts` (1 error)

**Problem**: `interaction.options.getString('key')` can return `string | null`, but the service expects `string | undefined`.

**Location**: Line 105

**Current Code**:
```typescript
const key = interaction.options.getString('key');  // Returns string | null
// Later used in:
await this.tradeService.addToTradeOffer(
  tradeId,
  user.character.id,
  gold,
  key,  // ERROR: null is not assignable to string | undefined
  qty,
);
```

**Fix**:
```typescript
const key = interaction.options.getString('key') ?? undefined;  // Convert null to undefined
// Later used in:
await this.tradeService.addToTradeOffer(
  tradeId,
  user.character.id,
  gold,
  key,  // Now string | undefined
  qty,
);
```

**Action**: On line 85 (where `key` is declared), add `?? undefined` to convert null to undefined.

---

### 1.4 Fix `src/discord/commands/trade-show.command.ts` (2 errors)

**Problem**: Same as trade-accept.command.ts - `parts` array inferred as `never[]`.

**Location**: Lines 104-110

**Current Code**:
```typescript
const buildOfferSummary = (gold: number, offerItems: any[], allItems: any[]) => {
  const parts = [];  // TypeScript infers never[]
  if (gold > 0) parts.push(`${gold} gold`);  // ERROR
  offerItems.forEach((offerItem) => {
    const item = allItems.find((i) => i.id === offerItem.itemId);
    if (item) parts.push(`${offerItem.qty}x ${item.name}`);  // ERROR
  });
  return parts.length > 0 ? parts.join(', ') : 'Nothing';
};
```

**Fix**:
```typescript
const buildOfferSummary = (gold: number, offerItems: any[], allItems: any[]) => {
  const parts: string[] = [];  // Explicitly type as string[]
  if (gold > 0) parts.push(`${gold} gold`);
  offerItems.forEach((offerItem) => {
    const item = allItems.find((i) => i.id === offerItem.itemId);
    if (item) parts.push(`${offerItem.qty}x ${item.name}`);
  });
  return parts.length > 0 ? parts.join(', ') : 'Nothing';
};
```

**Action**: Add explicit `: string[]` type annotation to the `parts` variable on line 105.

---

### 1.5 Fix `src/discord/discord.service.ts` (2 errors)

**Problem**: `process.env.DISCORD_TOKEN`, `process.env.CLIENT_ID`, and `process.env.GUILD_ID` can be `undefined`, but they're used where `string` is required.

**Location**: Lines 18 and 223

**Current Code**:
```typescript
constructor(/* ... */) {
  const token = process.env.DISCORD_TOKEN;
  this.rest = new REST({ version: '10' }).setToken(token);  // ERROR: token might be undefined
  // ...
}

async registerCommands() {
  // ...
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  await this.rest.put(Routes.applicationGuildCommands(clientId, guildId), {  // ERROR: clientId might be undefined
    body: commands,
  });
}
```

**Fix**:
```typescript
constructor(/* ... */) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
  this.rest = new REST({ version: '10' }).setToken(token);
  // ...
}

async registerCommands() {
  // ...
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  
  if (!clientId || !guildId) {
    throw new Error('CLIENT_ID and GUILD_ID environment variables are required');
  }
  
  await this.rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
}
```

**Action**: 
- After line 16, add validation that throws if `token` is undefined
- In `registerCommands` method, before line 223, add validation for `clientId` and `guildId`

---

### 1.6 Fix `src/trade/trade.service.ts` (4 errors)

**Problem**: After querying characters, `fromChar` and `toChar` might be `null`, but code accesses properties without checking.

**Location**: Lines 247-277 in `verifyTradeRequirements` method

**Current Code**:
```typescript
const fromChar = await tx.character.findUnique({
  where: { id: fromCharId },
  include: { inventory: true },
});

if (fromChar.gold < fromOffer.gold) {  // ERROR: fromChar possibly null
  throw new BadRequestException('Insufficient gold in trade offer');
}

for (const offerItem of fromOffer.items) {
  const inventory = fromChar.inventory.find(  // ERROR: fromChar possibly null
    (inv) => inv.itemId === offerItem.itemId,
  );
  // ...
}

const toChar = await tx.character.findUnique({
  where: { id: toCharId },
  include: { inventory: true },
});

if (toChar.gold < toOffer.gold) {  // ERROR: toChar possibly null
  throw new BadRequestException('Insufficient gold in trade offer');
}

for (const offerItem of toOffer.items) {
  const inventory = toChar.inventory.find(  // ERROR: toChar possibly null
    (inv) => inv.itemId === offerItem.itemId,
  );
  // ...
}
```

**Fix**:
```typescript
const fromChar = await tx.character.findUnique({
  where: { id: fromCharId },
  include: { inventory: true },
});

if (!fromChar) {
  throw new BadRequestException('Character not found');
}

if (fromChar.gold < fromOffer.gold) {
  throw new BadRequestException('Insufficient gold in trade offer');
}

for (const offerItem of fromOffer.items) {
  const inventory = fromChar.inventory.find(
    (inv) => inv.itemId === offerItem.itemId,
  );
  // ...
}

const toChar = await tx.character.findUnique({
  where: { id: toCharId },
  include: { inventory: true },
});

if (!toChar) {
  throw new BadRequestException('Character not found');
}

if (toChar.gold < toOffer.gold) {
  throw new BadRequestException('Insufficient gold in trade offer');
}

for (const offerItem of toOffer.items) {
  const inventory = toChar.inventory.find(
    (inv) => inv.itemId === offerItem.itemId,
  );
  // ...
}
```

**Action**: Add null checks after each character query (after lines 250 and 270).

---

### 1.7 Verification Step

**Action**: Run `yarn build` to verify all TypeScript errors are fixed.

**Expected Output**: Build should complete successfully with no errors.

**If errors persist**: Review the specific error message and ensure the fix was applied correctly.

---

## Phase 2: Complete Error Handling Refactoring (HIGH)

**Goal**: Implement the domain-driven error handling architecture  
**Time Estimate**: 2-3 hours  
**Files to Modify**: 7 files

### Context

The custom error classes and filter already exist in:
- `src/core/errors/errors.ts` - 8 custom domain error classes
- `src/core/errors/domain-error.filter.ts` - Global exception filter

These need to be:
1. Registered globally in the application
2. Used by services instead of generic exceptions
3. Allowed to propagate through command handlers (remove try-catch blocks)

---

### 2.1 Register the DomainErrorFilter Globally

**File**: `src/main.ts`

**Location**: After app creation, before bootstrap completes

**Current Code**:
```typescript
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Initialize Prisma
    const prismaService = app.get(PrismaService);
    await prismaService.onModuleInit();

    logger.log('🚀 EverReach Assistant Discord Bot starting...');
    // ...
```

**Add Import** (top of file):
```typescript
import { DomainErrorFilter } from './core/errors/domain-error.filter';
```

**Add Filter Registration** (after line 12, after app creation):
```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug', 'verbose'],
});

// Register global exception filter
app.useGlobalFilters(new DomainErrorFilter());

// Initialize Prisma
const prismaService = app.get(PrismaService);
```

**Explanation**: This registers the DomainErrorFilter to catch all `DomainError` instances thrown anywhere in the application.

---

### 2.2 Update Economy Service

**File**: `src/economy/economy.service.ts`

**Add Imports** (line 1):
```typescript
import { Injectable, Logger } from '@nestjs/common';  // Remove BadRequestException
import { PrismaService } from '../db/prisma.service';
import { 
  ItemNotFoundError, 
  InsufficientGoldError,
  CharacterNotFoundError 
} from '../core/errors/errors';
```

**Replace Exception #1** (line 25):
```typescript
// OLD:
if (!character) {
  throw new BadRequestException('Character not found');
}

// NEW:
if (!character) {
  throw new CharacterNotFoundError();
}
```

**Replace Exception #2** (line 32-34):
```typescript
// OLD:
if (!item) {
  throw new BadRequestException('Item not found');
}

// NEW:
if (!item) {
  throw new ItemNotFoundError(itemKey);
}
```

**Replace Exception #3** (line 38-40):
```typescript
// OLD:
if (character.gold < totalCost) {
  throw new BadRequestException('Insufficient gold');
}

// NEW:
if (character.gold < totalCost) {
  throw new InsufficientGoldError();
}
```

**Explanation**: The service now throws domain-specific errors that will be caught by the DomainErrorFilter and converted to user-friendly Discord messages.

---

### 2.3 Update Auction Service

**File**: `src/auction/auction.service.ts`

**Add Imports** (line 1-6):
```typescript
import { Injectable, Logger } from '@nestjs/common';  // Remove BadRequestException, NotFoundException
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ItemNotFoundError,
  InsufficientItemsError,
  InsufficientGoldError,
  AuctionNotFoundError,
  AuctionNotOpenError,
  AuctionExpiredError,
  SelfBidError,
  BidTooLowError,
  BidNotHigherError,
} from '../core/errors/errors';
```

**Find and Replace Exceptions** (9 locations):

1. **Line ~58** - Item validation:
```typescript
// OLD:
throw new BadRequestException('Item not found');
// NEW:
throw new ItemNotFoundError(itemKey);
```

2. **Line ~72** - Inventory check:
```typescript
// OLD:
throw new BadRequestException('Insufficient items to auction');
// NEW:
throw new InsufficientItemsError();
```

3. **Line ~128** - Auction not found:
```typescript
// OLD:
throw new NotFoundException('Auction not found');
// NEW:
throw new AuctionNotFoundError(auctionId);
```

4. **Line ~132** - Auction status:
```typescript
// OLD:
throw new BadRequestException('Auction is not open');
// NEW:
throw new AuctionNotOpenError(auctionId);
```

5. **Line ~136** - Auction expired:
```typescript
// OLD:
throw new BadRequestException('Auction has expired');
// NEW:
throw new AuctionExpiredError(auctionId);
```

6. **Line ~140** - Self bid:
```typescript
// OLD:
throw new BadRequestException('You cannot bid on your own auction');
// NEW:
throw new SelfBidError();
```

7. **Line ~144** - Minimum bid:
```typescript
// OLD:
throw new BadRequestException('Bid must be at least the minimum bid');
// NEW:
throw new BidTooLowError();
```

8. **Line ~148** - Higher bid required:
```typescript
// OLD:
throw new BadRequestException('Bid must be higher than current bid');
// NEW:
throw new BidNotHigherError();
```

9. **Line ~157** - Insufficient gold:
```typescript
// OLD:
throw new BadRequestException('Insufficient gold');
// NEW:
throw new InsufficientGoldError();
```

**Action**: Replace all 9 exception throws with their domain-specific equivalents.

---

### 2.4 Update Trade Service (Partial)

**File**: `src/trade/trade.service.ts`

**Note**: This service has 15+ exception throws. For Phase 2, we'll update the most critical ones that have corresponding domain errors. The rest will stay as `BadRequestException` for now (they're more specific business logic errors).

**Add Imports** (line 1-6):
```typescript
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import {
  InsufficientGoldError,
  InsufficientItemsError,
  ItemNotFoundError,
  CharacterNotFoundError,
} from '../core/errors/errors';
```

**Update Specific Exceptions**:

1. **Lines ~253, 273** - Gold validation (in `verifyTradeRequirements`):
```typescript
// OLD:
throw new BadRequestException('Insufficient gold in trade offer');
// NEW:
throw new InsufficientGoldError();
```

2. **Lines ~262, 282** - Item validation (in `verifyTradeRequirements`):
```typescript
// OLD:
throw new BadRequestException('Insufficient items in trade offer');
// NEW:
throw new InsufficientItemsError();
```

3. **Line ~115** - Item not found (in `addToTradeOffer`):
```typescript
// OLD:
throw new BadRequestException('Item not found');
// NEW:
throw new ItemNotFoundError(itemKey);
```

4. **Lines after null checks we added in Phase 1**:
```typescript
// In verifyTradeRequirements, after fromChar and toChar null checks:
// OLD:
throw new BadRequestException('Character not found');
// NEW:
throw new CharacterNotFoundError();
```

**Keep as BadRequestException**: Trade-specific errors like "Trade not found", "Trade is not pending", "You are not part of this trade", etc. These are acceptable to keep as generic exceptions.

---

### 2.5 Simplify Command Handlers - Remove Try-Catch Blocks

Now that services throw domain errors and the global filter handles them, we can remove the manual error handling from command handlers.

#### 2.5.1 Update `src/discord/commands/buy.command.ts`

**Remove** (lines 82-100):
```typescript
// DELETE THIS ENTIRE BLOCK:
} catch (error) {
  this.logger.error('Error in buy command:', error);

  let errorMessage =
    'An error occurred while making your purchase. Please try again.';

  if (error.message.includes('not found')) {
    errorMessage =
      'Item not found. Check the shop with `/shop` for available items.';
  } else if (error.message.includes('Insufficient gold')) {
    errorMessage =
      "You don't have enough gold for this purchase. Check your balance with `/inv`.";
  }

  return interaction.reply({
    content: errorMessage,
    ephemeral: true,
  });
}
```

**Replace the entire execute method structure**:
```typescript
async execute(interaction: ChatInputCommandInteraction) {
  const key = interaction.options.getString('key', true);
  const qty = interaction.options.getInteger('qty', true);
  const discordId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  const user = await this.usersService.getUserByDiscordId(
    discordId,
    guildId,
  );

  if (!user?.character) {
    return interaction.reply({
      content:
        'You need to register a character first! Use `/register <name>` to get started.',
      ephemeral: true,
    });
  }

  const result = await this.economyService.buyItem(
    user.character.id,
    key,
    qty,
  );

  const embed = new EmbedBuilder()
    .setTitle('✅ Purchase Successful')
    .setColor('#00ff00')
    .setDescription(
      `You bought **${qty}x ${result.item.name}** for **${result.totalCost} gold**`,
    )
    .addFields(
      {
        name: 'Remaining Gold',
        value: `${result.remainingGold}`,
        inline: true,
      },
      { name: 'Item', value: result.item.name, inline: true },
    );

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
```

**Note**: Remove the logger import if it's no longer used.

---

#### 2.5.2 Update `src/discord/commands/auction-bid.command.ts`

**Remove** (lines 87-114):
```typescript
// DELETE THIS ENTIRE BLOCK:
} catch (error) {
  this.logger.error('Error in auction bid command:', error);

  let errorMessage =
    'An error occurred while placing your bid. Please try again.';

  if (error.message.includes('not found')) {
    errorMessage =
      'Auction not found. Check `/auction list` for active auctions.';
  } else if (error.message.includes('not open')) {
    errorMessage = 'This auction is no longer open for bidding.';
  } else if (error.message.includes('expired')) {
    errorMessage = 'This auction has expired.';
  } else if (error.message.includes('own auction')) {
    errorMessage = 'You cannot bid on your own auction.';
  } else if (error.message.includes('minimum bid')) {
    errorMessage = 'Your bid must be at least the minimum bid amount.';
  } else if (error.message.includes('higher than current')) {
    errorMessage = 'Your bid must be higher than the current highest bid.';
  } else if (error.message.includes('Insufficient gold')) {
    errorMessage = "You don't have enough gold to place this bid.";
  }

  return interaction.reply({
    content: errorMessage,
    ephemeral: true,
  });
}
```

**Replace the entire execute method structure** (remove try-catch, keep only the logic).

---

#### 2.5.3 Update `src/discord/commands/auction-create.command.ts`

**Remove** (lines ~114-128):
```typescript
// DELETE the catch block with error.message string matching
```

**Replace with** no try-catch - just the command logic.

---

#### 2.5.4 Update Trade Commands

Apply the same pattern to:
- `src/discord/commands/trade-start.command.ts`
- `src/discord/commands/trade-add.command.ts`

Remove try-catch blocks that do string matching on `error.message`.

**Important**: Keep try-catch blocks that do actual error recovery or have complex logic. Only remove the ones doing simple error message translation.

---

### 2.6 Verification Step

**Action 1**: Run `yarn build` - should still compile.

**Action 2**: Run `yarn lint` - should see fewer errors related to unsafe error access.

**Action 3**: Manual test (if possible):
- Start the bot
- Trigger an error condition (e.g., try to buy item with insufficient gold)
- Verify Discord receives a clean error message with ⚠️ emoji

---

## Phase 3: Fix ESLint Errors (MEDIUM)

**Goal**: Clean up type safety warnings  
**Time Estimate**: 1-2 hours  
**Files to Modify**: Multiple test files and command handlers

### 3.1 Fix Command Handler Error Types

**Problem**: In remaining command handlers, `error` in catch blocks is typed as `any`.

**Pattern to Find**:
```typescript
} catch (error) {  // error is any
  this.logger.error('...', error);
  if (error.message.includes('...')) {  // Unsafe access
```

**Fix Pattern**:
```typescript
} catch (error) {
  this.logger.error('...', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (message.includes('...')) {
```

**Files to Update**:
- Any remaining command handlers that still have try-catch blocks
- Specifically: `history.command.ts`, `trade-accept.command.ts`, `trade-show.command.ts`

**Action**: For each catch block:
1. Add type guard: `error instanceof Error`
2. Extract message safely: `const message = error instanceof Error ? error.message : 'Unknown error'`
3. Use `message` instead of `error.message`

---

### 3.2 Fix Test Files - Mock Typing

**Problem**: Test mocks are typed as `any` or `error` type.

#### 3.2.1 Fix `src/economy/economy.service.spec.ts`

**Lines with errors**: Mock setup and assertions

**Pattern**:
```typescript
// OLD:
prismaService.character.findUnique.mockResolvedValue(/* ... */);

// This is typed as 'any' by Jest
```

**Fix**:
```typescript
// Cast mocks explicitly:
(prismaService.character.findUnique as jest.Mock).mockResolvedValue(/* ... */);

// Or better, define proper mock types at the top:
const mockCharacterFindUnique = prismaService.character.findUnique as jest.MockedFunction<typeof prismaService.character.findUnique>;
```

**Action**: 
1. At the top of each describe block, create typed mock references
2. Use these typed references throughout tests
3. This eliminates `@typescript-eslint/no-unsafe-call` errors

---

#### 3.2.2 Fix `src/notes/notes.service.spec.ts`

**Similar issues with mock typing and API response handling**

**Pattern for external API mocks**:
```typescript
// Define type for the expected response
interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

// Mock with proper type
const mockResponse: EmbeddingResponse = {
  data: [{ embedding: [0.1, 0.2, 0.3] }],
};
```

---

#### 3.2.3 Fix `src/trade/trade.service.spec.ts`

**Same mock typing issues**

**Action**: Apply same mock typing pattern as economy service tests.

---

#### 3.2.4 Fix `test/app.e2e-spec.ts`

**Problem**: Supertest response typing issues

**Current**:
```typescript
return request(app.getHttpServer())
  .get('/')
  .expect(200)
  .expect('Hello World!');
```

**Fix**: Add type assertion for supertest
```typescript
import * as request from 'supertest';

// Then use proper typing:
const response = await request(app.getHttpServer() as any)
  .get('/')
  .expect(200);
```

**Alternative**: Consider skipping these specific rules for e2e tests by adding:
```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
```

---

### 3.3 Fix `src/notes/notes.service.ts` (Production Code)

**Lines 152-153**: Unsafe API response access

**Current**:
```typescript
const vectors = response.data;
const queryEmbedding = vectors.data[0].embedding;
```

**Fix**: Add type definitions
```typescript
interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

// In the method:
const data = response.data as EmbeddingResponse;
if (!data || !data.data || !data.data[0] || !data.data[0].embedding) {
  throw new Error('Invalid embedding response format');
}
const queryEmbedding = data.data[0].embedding;
```

**Action**: Add proper type checking for external API responses.

---

### 3.4 Fix `src/discord/commands/history.command.ts`

**Problem**: Transaction log payload is JSON and accessed as `any`

**Lines 65-75**: Unsafe access to `txLog.payload` properties

**Current**:
```typescript
const txLog = await this.economyService.getTransactionHistory(user.character.id, 20);
// ...
const payload = JSON.parse(log.payload);  // returns any
if (log.type === 'BUY') {
  desc = `Purchased ${payload.quantity}x ${payload.itemName} for ${payload.totalCost} gold`;
}
```

**Fix**: Define payload types
```typescript
interface BuyPayload {
  quantity: number;
  itemName: string;
  totalCost: number;
  itemId: number;
  itemKey: string;
}

interface TradePayload {
  partnerCharId: number;
  qty: number;
  salePrice: number;
}

interface AdjustmentPayload {
  reason: string;
}

type TxLogPayload = BuyPayload | TradePayload | AdjustmentPayload;

// Then in code:
const payload = JSON.parse(log.payload) as TxLogPayload;

// Use type guards:
if (log.type === 'BUY' && 'itemName' in payload) {
  desc = `Purchased ${payload.quantity}x ${payload.itemName} for ${payload.totalCost} gold`;
}
```

**Action**: Add type definitions for transaction log payloads and use type guards.

---

### 3.5 Add ESLint Override for Test Async Functions

**Problem**: Many test functions are marked async but don't use await (they return promises directly)

**Options**:
1. Add `await` to the promise chains in tests
2. Remove `async` from the function signature
3. Add ESLint override

**Recommended**: Add ESLint configuration to allow this pattern in tests

**File**: `eslint.config.mjs`

**Add**:
```javascript
{
  files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  rules: {
    '@typescript-eslint/require-await': 'off',
  },
},
```

---

### 3.6 Verification Step

**Action**: Run `yarn lint`

**Expected Result**: 
- Should see significant reduction in errors
- Remaining errors should be minor or intentional
- Target: < 20 errors remaining (down from 109)

---

## Phase 4: Performance Optimization (LOW)

**Goal**: Eliminate N+1 query problems and optimize database access  
**Time Estimate**: 1-2 hours

### 4.1 Audit Prisma Queries

**Method**: Search for patterns that might cause N+1 queries

**Command**: 
```bash
grep -r "findMany" src/ --include="*.ts"
grep -r "findUnique" src/ --include="*.ts"
```

**Look for**:
- Loops that call `findUnique` or `findMany`
- Missing `include` clauses when relations are accessed later
- Sequential queries that could be combined

---

### 4.2 Review Trade Service Queries

**File**: `src/trade/trade.service.ts`

**Method**: `getActiveTradesForCharacter` (line ~165)

**Check if it uses proper `include`**:
```typescript
// Should include all needed relations:
return this.prisma.trade.findMany({
  where: {
    OR: [
      { initiatorCharId: characterId },
      { partnerCharId: characterId },
    ],
    status: 'PENDING',
  },
  include: {
    initiatorChar: true,  // ✓ Should be included
    partnerChar: true,    // ✓ Should be included
    offerFrom: {          // ✓ Should be included
      include: {
        items: {
          include: {
            item: true,   // ✓ Nested include for item details
          },
        },
      },
    },
    offerTo: {            // ✓ Should be included
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    },
  },
});
```

**Action**: Verify all relation accesses are covered by `include` clauses. If any relations are accessed without being included, add them.

---

### 4.3 Review Auction Service Queries

**File**: `src/auction/auction.service.ts`

**Methods to check**:
- `getActiveAuctions`
- `getAuction`
- `getUserAuctions`

**Pattern**:
```typescript
// Good - single query with all relations:
return this.prisma.auction.findMany({
  where: { /* ... */ },
  include: {
    item: true,
    seller: true,
    bidder: true,
  },
});

// Bad - would need to query for each auction's relations:
const auctions = await this.prisma.auction.findMany();
for (const auction of auctions) {
  const item = await this.prisma.item.findUnique({ where: { id: auction.itemId }});
}
```

**Action**: Verify existing queries already use `include`. Based on type definitions seen earlier, they likely already do this correctly.

---

### 4.4 Review Notes Service Queries

**File**: `src/notes/notes.service.ts`

**Method**: `searchNotes` (line ~115)

**Current approach**: Loads all user notes into memory, calculates similarity in JavaScript

**Potential optimization**:
```typescript
// Current (in-memory filtering):
const allNotes = await this.prisma.userNote.findMany({
  where: { userId },
});
const filtered = allNotes.filter(note => similarity(note.embedding, queryEmbedding) > threshold);

// Better: Could use database for initial filtering if SQLite supports vector operations
// However, SQLite doesn't have native vector search, so current approach is acceptable
```

**Conclusion**: Current approach is acceptable for SQLite. If database grows large, consider:
1. Switching to PostgreSQL with pgvector extension
2. Using a dedicated vector database (Pinecone, Weaviate)
3. Adding pagination to limit notes loaded

**Action**: Document the limitation; no immediate changes needed.

---

### 4.5 Add Query Logging (Development Tool)

**File**: `src/db/prisma.service.ts`

**Add** (after line 15):
```typescript
async onModuleInit() {
  await this.$connect();
  
  // Log queries in development
  if (process.env.NODE_ENV !== 'production') {
    this.$on('query' as never, (e: any) => {
      console.log('Query: ' + e.query);
      console.log('Duration: ' + e.duration + 'ms');
    });
  }
}
```

**Benefit**: Helps identify slow queries during development.

---

### 4.6 Verification Step

**Action**: 
1. Review query logs for any N+1 patterns
2. Test performance of list operations (trade list, auction list, inventory)
3. Document any remaining performance concerns

---

## Phase 5: Final Verification

**Goal**: Ensure all changes work together correctly

### 5.1 Build & Lint Check

```bash
yarn build
yarn lint
```

**Expected**: Both should pass with no errors.

---

### 5.2 Run Tests

```bash
yarn test
```

**Expected**: All tests should pass. If any fail:
- Review the failure
- Update mocks to match new error types
- Fix any logic issues

---

### 5.3 Manual Testing (If Possible)

**Test Scenarios**:

1. **Error Handling**:
   - Try to buy item without enough gold → Should get clean error message
   - Try to bid on non-existent auction → Should get clean error message
   - Try to use commands without registering → Should get clean error message

2. **Happy Paths**:
   - Register character
   - Buy item
   - Create auction
   - Place bid
   - Create trade
   - Accept trade

3. **Edge Cases**:
   - Invalid item keys
   - Expired trades/auctions
   - Self-bidding attempts

---

### 5.4 Update Documentation

**File**: `gemini.md`

**Add** to the Action Log section:
```markdown
- **2025-10-09:**
  - Comprehensive codebase analysis performed
  - Created detailed implementation plan (IMPLEMENTATION_PLAN.md)
  - Fixed 14 TypeScript compilation errors
  - Completed domain error handling refactoring:
    - Registered DomainErrorFilter globally
    - Updated Economy, Auction, and Trade services to throw domain errors
    - Simplified command handlers by removing manual error handling
  - Reduced ESLint errors from 109 to < 20
  - Audited Prisma queries for N+1 problems (none found)
  - All tests passing
  - Build successful
```

---

### 5.5 Git Commit Strategy

**Recommended approach**: Commit after each phase

**Phase 1 Commit**:
```bash
git add src/discord/commands/register.command.ts
git add src/discord/commands/trade-accept.command.ts
git add src/discord/commands/trade-add.command.ts
git add src/discord/commands/trade-show.command.ts
git add src/discord/discord.service.ts
git add src/trade/trade.service.ts
git commit -m "fix: resolve TypeScript compilation errors

- Add null checks for user queries in register command
- Fix type inference for array operations in trade commands
- Add environment variable validation in discord service
- Add character existence validation in trade service

Resolves 14 TypeScript strict-null-check errors"
```

**Phase 2 Commit**:
```bash
git add src/core/
git add src/main.ts
git add src/economy/economy.service.ts
git add src/auction/auction.service.ts
git add src/trade/trade.service.ts
git add src/discord/commands/*.ts
git commit -m "feat: implement domain-driven error handling

- Register DomainErrorFilter globally to catch domain errors
- Update services to throw domain-specific errors
- Simplify command handlers by removing manual error handling
- Improve separation of concerns (business vs presentation logic)

This completes the error handling refactoring started previously.
Error messages are now consistent and user-friendly across all commands."
```

**Phase 3 Commit**:
```bash
git add src/
git add test/
git add eslint.config.mjs
git commit -m "chore: improve type safety and fix linting errors

- Add proper type guards for error handling
- Type test mocks correctly
- Add type definitions for JSON payloads
- Configure ESLint overrides for test files

Reduces ESLint errors from 109 to under 20."
```

**Phase 4 Commit**:
```bash
git add src/db/prisma.service.ts
git commit -m "perf: add query logging for development

- Enable Prisma query logging in development mode
- Verified no N+1 query problems exist
- Documented performance considerations for notes service"
```

---

## Summary Checklist

Use this to track progress:

### Phase 1: TypeScript Errors ✓
- [ ] Fix register.command.ts (3 errors)
- [ ] Fix trade-accept.command.ts (2 errors)
- [ ] Fix trade-add.command.ts (1 error)
- [ ] Fix trade-show.command.ts (2 errors)
- [ ] Fix discord.service.ts (2 errors)
- [ ] Fix trade.service.ts (4 errors)
- [ ] Verify: `yarn build` succeeds

### Phase 2: Error Handling ✓
- [ ] Register DomainErrorFilter in main.ts
- [ ] Update economy.service.ts (3 exceptions)
- [ ] Update auction.service.ts (9 exceptions)
- [ ] Update trade.service.ts (partial - 4 exceptions)
- [ ] Simplify buy.command.ts
- [ ] Simplify auction-bid.command.ts
- [ ] Simplify auction-create.command.ts
- [ ] Simplify trade commands
- [ ] Verify: Error messages work correctly

### Phase 3: ESLint Errors ✓
- [ ] Fix command handler error types
- [ ] Fix economy.service.spec.ts mocks
- [ ] Fix notes.service.spec.ts mocks
- [ ] Fix trade.service.spec.ts mocks
- [ ] Fix app.e2e-spec.ts types
- [ ] Fix notes.service.ts API typing
- [ ] Fix history.command.ts payload types
- [ ] Add ESLint test overrides
- [ ] Verify: `yarn lint` shows < 20 errors

### Phase 4: Performance ✓
- [ ] Audit trade service queries
- [ ] Audit auction service queries
- [ ] Review notes service approach
- [ ] Add query logging
- [ ] Document findings

### Phase 5: Final Verification ✓
- [ ] `yarn build` passes
- [ ] `yarn lint` passes
- [ ] `yarn test` passes
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Changes committed

---

## Estimated Timeline

- **Phase 1**: 30-45 minutes (mechanical fixes)
- **Phase 2**: 2-3 hours (requires careful testing)
- **Phase 3**: 1-2 hours (mostly mechanical, some thinking)
- **Phase 4**: 1-2 hours (analysis and review)
- **Phase 5**: 30 minutes (verification)

**Total**: 5-8 hours for complete implementation

---

## Notes for the Implementer

1. **Test after each phase**: Don't wait until the end to run tests
2. **Read error messages carefully**: TypeScript errors are specific and helpful
3. **Use IDE features**: Let your IDE show you where errors are
4. **Commit frequently**: Each phase can be a separate commit
5. **Ask for help**: If something is unclear, reference this plan and ask specific questions

Good luck! 🚀

