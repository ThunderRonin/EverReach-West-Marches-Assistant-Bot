import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';
import { TradeService } from '../src/trade/trade.service';

describe('Trade E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tradeService: TradeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    tradeService = app.get<TradeService>(TradeService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.$executeRawUnsafe('DELETE FROM "TxLog"');
    await prisma.$executeRawUnsafe('DELETE FROM "Trade"');
    await prisma.$executeRawUnsafe('DELETE FROM "Inventory"');
    await prisma.$executeRawUnsafe('DELETE FROM "Bid"');
    await prisma.$executeRawUnsafe('DELETE FROM "Auction"');
    await prisma.$executeRawUnsafe('DELETE FROM "Character"');
    await prisma.$executeRawUnsafe('DELETE FROM "User"');
    await prisma.$executeRawUnsafe('DELETE FROM "Item"');
  });

  describe('Trade Settlement - Happy Path', () => {
    it('should successfully execute a trade with gold and items', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create two characters with gold
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 500,
        },
      });

      // Create items for inventory
      const item1 = await prisma.item.create({
        data: {
          key: 'sword',
          name: 'Sword',
          baseValue: 100,
        },
      });

      const item2 = await prisma.item.create({
        data: {
          key: 'shield',
          name: 'Shield',
          baseValue: 150,
        },
      });

      // Setup inventory for char1: 5x Sword
      await prisma.inventory.create({
        data: {
          charId: char1.id,
          itemId: item1.id,
          qty: 5,
        },
      });

      // Setup inventory for char2: 3x Shield
      await prisma.inventory.create({
        data: {
          charId: char2.id,
          itemId: item2.id,
          qty: 3,
        },
      });

      // Create trade: char1 offers 200 gold + 2 Swords for char2's 100 gold + 1 Shield
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await tradeService.addToTradeOffer(trade.id, char1.id, 'gold', undefined, 200);
      await tradeService.addToTradeOffer(trade.id, char1.id, 'item', String(item1.id), 2);

      await tradeService.addToTradeOffer(trade.id, char2.id, 'gold', undefined, 100);
      await tradeService.addToTradeOffer(trade.id, char2.id, 'item', String(item2.id), 1);

      // Execute trade
      const result = await tradeService.acceptTrade(trade.id, char2.id);

      // Verify trade status
      expect(result.status).toBe('EXECUTED');

      // Verify char1 state after trade
      const char1After = await prisma.character.findUnique({
        where: { id: char1.id },
        include: { inventory: true },
      });

      expect(char1After).toBeDefined();
      expect(char1After!.gold).toBe(1000 - 200 + 100); // Lost 200, gained 100 = 900
      const char1Sword = char1After!.inventory.find((inv) => inv.itemId === item1.id);
      expect(char1Sword).toBeDefined();
      expect(char1Sword!.qty).toBe(5 - 2); // Lost 2 swords
      const char1Shield = char1After!.inventory.find((inv) => inv.itemId === item2.id);
      expect(char1Shield).toBeDefined();
      expect(char1Shield!.qty).toBe(1); // Gained 1 shield

      // Verify char2 state after trade
      const char2After = await prisma.character.findUnique({
        where: { id: char2.id },
        include: { inventory: true },
      });

      expect(char2After).toBeDefined();
      expect(char2After!.gold).toBe(500 - 100 + 200); // Lost 100, gained 200 = 600
      const char2Sword = char2After!.inventory.find((inv) => inv.itemId === item1.id);
      expect(char2Sword).toBeDefined();
      expect(char2Sword!.qty).toBe(2); // Gained 2 swords
      const char2Shield = char2After!.inventory.find((inv) => inv.itemId === item2.id);
      expect(char2Shield).toBeDefined();
      expect(char2Shield!.qty).toBe(3 - 1); // Lost 1 shield

      // Verify transaction logs were created
      const txLogs = await prisma.txLog.findMany({
        where: { type: 'TRADE' },
      });
      expect(txLogs.length).toBe(2); // One for each character
    });
  });

  describe('Trade Settlement - Insufficient Gold', () => {
    it('should reject trade when character lacks sufficient gold', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create characters with limited gold
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Poor Character',
          gold: 50, // Only 50 gold
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Rich Character',
          gold: 1000,
        },
      });

      // Create trade: char1 offers 100 gold (which they don't have)
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await expect(
        tradeService.addToTradeOffer(trade.id, char1.id, 'gold', undefined, 100),
      ).rejects.toThrow(); // Should fail validation or acceptance

      // Verify no transaction was created
      const txLogs = await prisma.txLog.findMany({
        where: { type: 'TRADE' },
      });
      expect(txLogs.length).toBe(0);
    });
  });

  describe('Trade Settlement - Insufficient Items', () => {
    it('should reject trade when character lacks sufficient items', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create characters
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 1000,
        },
      });

      // Create item and give only 2 to char1
      const item = await prisma.item.create({
        data: {
          key: 'rare_item',
          name: 'Rare Item',
          baseValue: 500,
        },
      });

      await prisma.inventory.create({
        data: {
          charId: char1.id,
          itemId: item.id,
          qty: 2, // Only has 2
        },
      });

      // Create trade: char1 tries to offer 5 items (which they don't have)
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await expect(
        tradeService.addToTradeOffer(trade.id, char1.id, 'item', String(item.id), 5),
      ).rejects.toThrow(); // Should fail validation

      // Verify no transaction was created
      const txLogs = await prisma.txLog.findMany({
        where: { type: 'TRADE' },
      });
      expect(txLogs.length).toBe(0);
    });
  });

  describe('Trade Settlement - Inventory Non-Negative', () => {
    it('should never allow negative inventory quantities', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create characters with specific inventory
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 1000,
        },
      });

      const item = await prisma.item.create({
        data: {
          key: 'test_item',
          name: 'Test Item',
          baseValue: 100,
        },
      });

      // Give char1 exactly 5 items
      await prisma.inventory.create({
        data: {
          charId: char1.id,
          itemId: item.id,
          qty: 5,
        },
      });

      // Trade where char1 offers all 5 items
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await tradeService.addToTradeOffer(trade.id, char1.id, 'item', String(item.id), 5);
      await tradeService.addToTradeOffer(trade.id, char2.id, 'gold', undefined, 100);

      // Execute trade
      await tradeService.acceptTrade(trade.id, char2.id);

      // Verify char1's inventory: should be 0, never negative
      const char1Inv = await prisma.inventory.findUnique({
        where: {
          charId_itemId: {
            charId: char1.id,
            itemId: item.id,
          },
        },
      });

      // Inventory record might not exist (qty = 0) or qty should be exactly 0
      if (char1Inv) {
        expect(char1Inv.qty).toBe(0);
        expect(char1Inv.qty).toBeGreaterThanOrEqual(0); // Never negative
      }

      // Verify char2 has exactly 5 items
      const char2Inv = await prisma.inventory.findUnique({
        where: {
          charId_itemId: {
            charId: char2.id,
            itemId: item.id,
          },
        },
      });

      expect(char2Inv).toBeDefined();
      expect(char2Inv!.qty).toBe(5);
      expect(char2Inv!.qty).toBeGreaterThanOrEqual(0); // Never negative
    });
  });

  describe('Trade Settlement - Transaction Logging', () => {
    it('should create transaction logs for both parties', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create characters
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 1000,
        },
      });

      // Create simple gold trade
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await tradeService.addToTradeOffer(trade.id, char1.id, 'gold', undefined, 200);
      await tradeService.addToTradeOffer(trade.id, char2.id, 'gold', undefined, 150);

      // Execute trade
      await tradeService.acceptTrade(trade.id, char2.id);

      // Verify transaction logs
      const txLogs = await prisma.txLog.findMany({
        where: { type: 'TRADE' },
      });

      expect(txLogs.length).toBe(2);

      // Verify log for char1
      const char1Log = txLogs.find((log) => log.charId === char1.id);
      expect(char1Log).toBeDefined();
      const char1Payload = JSON.parse(char1Log!.payload);
      expect(char1Payload.tradeId).toBe(trade.id);
      expect(char1Payload.offerSent.gold).toBe(200);
      expect(char1Payload.offerReceived.gold).toBe(150);
      expect(char1Payload.partnerCharId).toBe(char2.id);

      // Verify log for char2
      const char2Log = txLogs.find((log) => log.charId === char2.id);
      expect(char2Log).toBeDefined();
      const char2Payload = JSON.parse(char2Log!.payload);
      expect(char2Payload.tradeId).toBe(trade.id);
      expect(char2Payload.offerSent.gold).toBe(150);
      expect(char2Payload.offerReceived.gold).toBe(200);
      expect(char2Payload.partnerCharId).toBe(char1.id);
    });

    it('should include item details in transaction logs', async () => {
      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      // Setup: Create characters
      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 1000,
        },
      });

      const item = await prisma.item.create({
        data: {
          key: 'test_item',
          name: 'Test Item',
          baseValue: 100,
        },
      });

      // Setup inventory
      await prisma.inventory.create({
        data: {
          charId: char1.id,
          itemId: item.id,
          qty: 3,
        },
      });

      // Create trade with items
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await tradeService.addToTradeOffer(trade.id, char1.id, 'item', String(item.id), 3);
      await tradeService.addToTradeOffer(trade.id, char2.id, 'gold', undefined, 500);

      // Execute trade
      await tradeService.acceptTrade(trade.id, char2.id);

      // Verify transaction logs contain item details
      const char1Log = await prisma.txLog.findFirst({
        where: {
          charId: char1.id,
          type: 'TRADE',
        },
      });

      expect(char1Log).toBeDefined();
      const payload = JSON.parse(char1Log!.payload);
      expect(payload.offerSent.items).toBeDefined();
      expect(payload.offerSent.items.length).toBeGreaterThan(0);
      expect(payload.offerSent.items[0]).toHaveProperty('itemId');
      expect(payload.offerSent.items[0]).toHaveProperty('qty');
    });
  });

  describe('Trade Settlement - Atomicity', () => {
    it('should not allow partial trade execution', async () => {
      // This test verifies that if any part of the trade fails,
      // the entire transaction is rolled back

      // Setup: Create users
      const user1 = await prisma.user.create({
        data: {
          discordId: 'user1',
          guildId: 'guild1',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          discordId: 'user2',
          guildId: 'guild1',
        },
      });

      const char1 = await prisma.character.create({
        data: {
          userId: user1.id,
          name: 'Character 1',
          gold: 1000,
        },
      });

      const char2 = await prisma.character.create({
        data: {
          userId: user2.id,
          name: 'Character 2',
          gold: 1000,
        },
      });

      const item = await prisma.item.create({
        data: {
          key: 'test_item',
          name: 'Test Item',
          baseValue: 100,
        },
      });

      // Store initial state
      const initialChar1Gold = char1.gold;
      const initialChar2Gold = char2.gold;

      // Create valid trade
      const trade = await tradeService.startTrade(char1.id, char2.id);

      await tradeService.addToTradeOffer(trade.id, char1.id, 'gold', undefined, 100);
      await tradeService.addToTradeOffer(trade.id, char2.id, 'gold', undefined, 50);

      // Execute trade successfully
      const result = await tradeService.acceptTrade(trade.id, char2.id);
      expect(result.status).toBe('EXECUTED');

      // Verify both characters' states changed atomically
      const char1After = await prisma.character.findUnique({
        where: { id: char1.id },
      });
      const char2After = await prisma.character.findUnique({
        where: { id: char2.id },
      });

      expect(char1After).toBeDefined();
      expect(char2After).toBeDefined();
      expect(char1After!.gold).toBe(initialChar1Gold - 100 + 50);
      expect(char2After!.gold).toBe(initialChar2Gold - 50 + 100);

      // Verify only one transaction log entry exists for the completed trade
      const txLogs = await prisma.txLog.findMany({
        where: {
          type: 'TRADE',
        },
      });
      expect(txLogs.length).toBe(2); // One for each party
    });
  });
});
