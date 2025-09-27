import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { TradeService } from './trade.service';

describe('TradeService', () => {
  let service: TradeService;

  const mockTrade = {
    id: 1,
    fromCharId: 1,
    toCharId: 2,
    offerFrom: JSON.stringify({ items: [], gold: 0 }),
    offerTo: JSON.stringify({ items: [], gold: 0 }),
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockCharacter = {
    id: 1,
    name: 'Test Character',
    gold: 1000,
    inventory: [],
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    trade: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      find: jest.fn(),
      upsert: jest.fn(),
    },
    txLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TradeService>(TradeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startTrade', () => {
    it('should successfully start a trade', async () => {
      mockPrismaService.trade.findFirst.mockResolvedValue(null);
      mockPrismaService.trade.create.mockResolvedValue(mockTrade);

      const result = await service.startTrade(1, 2);

      expect(result).toEqual(mockTrade);
      expect(mockPrismaService.trade.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromCharId: 1,
          toCharId: 2,
          offerFrom: JSON.stringify({ items: [], gold: 0 }),
          offerTo: JSON.stringify({ items: [], gold: 0 }),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw error when trade already exists', async () => {
      mockPrismaService.trade.findFirst.mockResolvedValue(mockTrade);

      await expect(service.startTrade(1, 2)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addToTradeOffer', () => {
    it('should successfully add gold to trade offer', async () => {
      const tradeWithGold = {
        ...mockTrade,
        offerFrom: JSON.stringify({ items: [], gold: 100 }),
      };

      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.character.findUnique.mockResolvedValue(mockCharacter);
      mockPrismaService.trade.update.mockResolvedValue(tradeWithGold);

      const result = await service.addToTradeOffer(1, 1, 'gold', undefined, 50);

      expect(result).toEqual(tradeWithGold);
      expect(mockPrismaService.trade.update).toHaveBeenCalled();
    });

    it('should throw error when trade not found', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(
        service.addToTradeOffer(1, 1, 'gold', undefined, 50),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when trade expired', async () => {
      const expiredTrade = {
        ...mockTrade,
        expiresAt: new Date(Date.now() - 1000),
      };

      mockPrismaService.trade.findUnique.mockResolvedValue(expiredTrade);

      await expect(
        service.addToTradeOffer(1, 1, 'gold', undefined, 50),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptTrade', () => {
    it('should successfully accept a trade', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          trade: {
            findUnique: jest.fn().mockResolvedValue(mockTrade),
            update: jest.fn(),
          },
          character: {
            findUnique: jest.fn().mockResolvedValue(mockCharacter),
          },
          inventory: {
            find: jest.fn().mockReturnValue({ qty: 10 }),
            upsert: jest.fn(),
          },
          txLog: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      const result = await service.acceptTrade(1, 2);

      expect(result).toEqual(mockTrade);
    });

    it('should throw error when trade not found', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          trade: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      await expect(service.acceptTrade(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when not the recipient', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          trade: {
            findUnique: jest.fn().mockResolvedValue(mockTrade),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      // Try to accept as the sender instead of recipient
      await expect(service.acceptTrade(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cleanupExpiredTrades', () => {
    it('should cleanup expired trades', async () => {
      const expiredTrades = [mockTrade];
      mockPrismaService.trade.findMany.mockResolvedValue(expiredTrades);
      mockPrismaService.trade.update.mockResolvedValue({});

      const result = await service.cleanupExpiredTrades();

      expect(result).toBe(1);
      expect(mockPrismaService.trade.update).toHaveBeenCalledWith({
        where: { id: mockTrade.id },
        data: { status: 'EXPIRED' },
      });
    });
  });
});
