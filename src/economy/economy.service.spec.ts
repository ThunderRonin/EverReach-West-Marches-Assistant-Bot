import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { EconomyService } from './economy.service';

describe('EconomyService', () => {
  let service: EconomyService;

  const mockCharacter = {
    id: 1,
    name: 'Test Character',
    gold: 1000,
    inventory: [],
  };

  const mockItem = {
    id: 1,
    key: 'health_potion',
    name: 'Health Potion',
    baseValue: 25,
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    item: {
      findUnique: jest.fn(),
    },
    inventory: {
      upsert: jest.fn(),
    },
    txLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EconomyService>(EconomyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buyItem', () => {
    it('should successfully buy an item', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          character: {
            findUnique: jest.fn().mockResolvedValue(mockCharacter),
          },
          item: {
            findUnique: jest.fn().mockResolvedValue(mockItem),
          },
          character: {
            update: jest.fn(),
          },
          inventory: {
            upsert: jest.fn(),
          },
          txLog: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      const result = await service.buyItem(1, 'health_potion', 2);

      expect(result).toBeDefined();
      expect(result.item).toEqual(mockItem);
      expect(result.quantity).toBe(2);
      expect(result.totalCost).toBe(50);
    });

    it('should throw error when character not found', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          character: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      await expect(service.buyItem(1, 'health_potion', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when item not found', async () => {
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          character: {
            findUnique: jest.fn().mockResolvedValue(mockCharacter),
          },
          item: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      await expect(service.buyItem(1, 'invalid_item', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when insufficient gold', async () => {
      const poorCharacter = { ...mockCharacter, gold: 10 };
      const transactionMock = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          character: {
            findUnique: jest.fn().mockResolvedValue(poorCharacter),
          },
          item: {
            findUnique: jest.fn().mockResolvedValue(mockItem),
          },
        };
        return callback(mockTx);
      });

      mockPrismaService.$transaction.mockImplementation(transactionMock);

      await expect(service.buyItem(1, 'health_potion', 2)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCharacterInventory', () => {
    it('should return character inventory', async () => {
      const mockInventory = [
        {
          id: 1,
          charId: 1,
          itemId: 1,
          qty: 5,
          item: mockItem,
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventory);

      const result = await service.getCharacterInventory(1);

      expect(result).toEqual(mockInventory);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith({
        where: { charId: 1 },
        include: { item: true },
        orderBy: { item: { name: 'asc' } },
      });
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          id: 1,
          charId: 1,
          type: 'BUY',
          payload: JSON.stringify({ itemId: 1, quantity: 1, totalCost: 25 }),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.txLog.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getTransactionHistory(1, 5);

      expect(result).toEqual(mockTransactions);
      expect(mockPrismaService.txLog.findMany).toHaveBeenCalledWith({
        where: { charId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });
});
