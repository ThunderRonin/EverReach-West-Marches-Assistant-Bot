import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionService, AuctionWithRelations } from './auction.service';
import { PrismaService } from '../db/prisma.service';
import {
  ItemNotFoundError,
  InsufficientItemsError,
  InsufficientGoldError,
  AuctionNotFoundError,
  SelfBidError,
  BidTooLowError,
  BidNotHigherError,
} from '../core/errors/errors';

describe('AuctionService', () => {
  let service: AuctionService;

  const mockItem = {
    id: 1,
    key: 'iron_sword',
    name: 'Iron Sword',
    baseValue: 50,
  };

  const mockSeller = {
    id: 1,
    name: 'SellerHero',
    gold: 500,
  };

  const mockBidder1 = {
    id: 2,
    name: 'BidderOne',
    gold: 1000,
  };

  const mockBidder2 = {
    id: 3,
    name: 'BidderTwo',
    gold: 1500,
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    item: {
      findUnique: jest.fn(),
    },
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bid: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    txLog: {
      create: jest.fn(),
    },
    auctionMessage: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrismaService) => Promise<unknown>) => {
        return cb(mockPrismaService);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAuction', () => {
    it('should throw ItemNotFoundError if item does not exist', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(
        service.createAuction(mockSeller.id, 'unknown_item', 1, 50, 60),
      ).rejects.toThrow(ItemNotFoundError);
    });

    it('should throw InsufficientItemsError if seller has insufficient inventory', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.inventory.findUnique.mockResolvedValue({ qty: 0 });

      await expect(
        service.createAuction(mockSeller.id, mockItem.key, 2, 50, 60),
      ).rejects.toThrow(InsufficientItemsError);
    });

    it('should deduct items and create auction in transaction', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.inventory.findUnique.mockResolvedValue({ qty: 5 });

      const createdAuction = {
        id: 10,
        sellerId: mockSeller.id,
        itemId: mockItem.id,
        qty: 2,
        minBid: 50,
        currentBid: null,
        currentBidderId: null,
        status: 'OPEN',
        item: mockItem,
        seller: mockSeller,
      };

      mockPrismaService.inventory.update.mockResolvedValue({ qty: 3 });
      mockPrismaService.auction.create.mockResolvedValue(createdAuction);
      mockPrismaService.txLog.create.mockResolvedValue({ id: 1 });

      const result = await service.createAuction(
        mockSeller.id,
        mockItem.key,
        2,
        50,
        60,
      );

      expect(result).toEqual(createdAuction);
      expect(mockPrismaService.inventory.update).toHaveBeenCalled();
      expect(mockPrismaService.auction.create).toHaveBeenCalled();
    });
  });

  describe('placeBid', () => {
    const baseAuction = {
      id: 10,
      sellerId: mockSeller.id,
      itemId: mockItem.id,
      qty: 1,
      minBid: 100,
      currentBid: null,
      currentBidderId: null,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      item: mockItem,
      seller: mockSeller,
      bidder: null,
    };

    it('should throw AuctionNotFoundError if auction does not exist', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(null);

      await expect(service.placeBid(999, mockBidder1.id, 150)).rejects.toThrow(
        AuctionNotFoundError,
      );
    });

    it('should throw SelfBidError if seller tries to bid', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(baseAuction);

      await expect(
        service.placeBid(baseAuction.id, mockSeller.id, 150),
      ).rejects.toThrow(SelfBidError);
    });

    it('should throw BidTooLowError if bid is lower than minBid', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(baseAuction);

      await expect(
        service.placeBid(baseAuction.id, mockBidder1.id, 50),
      ).rejects.toThrow(BidTooLowError);
    });

    it('should throw BidNotHigherError if bid is not higher than currentBid', async () => {
      const auctionWithBid = {
        ...baseAuction,
        currentBid: 200,
        currentBidderId: mockBidder1.id,
      };
      mockPrismaService.auction.findUnique.mockResolvedValue(auctionWithBid);

      await expect(
        service.placeBid(baseAuction.id, mockBidder2.id, 200),
      ).rejects.toThrow(BidNotHigherError);
    });

    it('should throw InsufficientGoldError if bidder does not have enough gold', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(baseAuction);
      mockPrismaService.character.findUnique.mockResolvedValue({
        ...mockBidder1,
        gold: 50,
      });

      await expect(
        service.placeBid(baseAuction.id, mockBidder1.id, 150),
      ).rejects.toThrow(InsufficientGoldError);
    });

    it('should escrow gold from bidder on valid bid', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(baseAuction);
      mockPrismaService.character.findUnique.mockResolvedValue(mockBidder1);

      const updatedAuction = {
        ...baseAuction,
        currentBid: 150,
        currentBidderId: mockBidder1.id,
        bidder: mockBidder1,
      };
      mockPrismaService.auction.update.mockResolvedValue(updatedAuction);

      const result = await service.placeBid(
        baseAuction.id,
        mockBidder1.id,
        150,
      );

      expect(result).toEqual(updatedAuction);
      // Gold deducted from bidder 1
      expect(mockPrismaService.character.update).toHaveBeenCalledWith({
        where: { id: mockBidder1.id },
        data: { gold: { decrement: 150 } },
      });
    });

    it('should refund previous bidder and escrow new bidder when outbidding', async () => {
      const auctionWithPriorBid = {
        ...baseAuction,
        currentBid: 150,
        currentBidderId: mockBidder1.id,
      };

      mockPrismaService.auction.findUnique.mockResolvedValue(
        auctionWithPriorBid,
      );
      mockPrismaService.character.findUnique.mockResolvedValue(mockBidder2);

      const updatedAuction = {
        ...auctionWithPriorBid,
        currentBid: 250,
        currentBidderId: mockBidder2.id,
        bidder: mockBidder2,
      };
      mockPrismaService.auction.update.mockResolvedValue(updatedAuction);

      await service.placeBid(baseAuction.id, mockBidder2.id, 250);

      // Refunded previous bidder (mockBidder1 gets 150 back)
      expect(mockPrismaService.character.update).toHaveBeenCalledWith({
        where: { id: mockBidder1.id },
        data: { gold: { increment: 150 } },
      });

      // Escrowed new bidder (mockBidder2 pays 250)
      expect(mockPrismaService.character.update).toHaveBeenCalledWith({
        where: { id: mockBidder2.id },
        data: { gold: { decrement: 250 } },
      });
    });
  });

  describe('getActiveAuctions', () => {
    it('should return open active auctions', async () => {
      const mockAuctions = [
        {
          id: 1,
          status: 'OPEN',
          item: mockItem,
          seller: mockSeller,
          bidder: null,
        },
      ];

      mockPrismaService.auction.findMany.mockResolvedValue(mockAuctions);

      const result = await service.getActiveAuctions();
      expect(result).toEqual(mockAuctions);
      expect(mockPrismaService.auction.findMany).toHaveBeenCalled();
    });
  });

  describe('settleAuction', () => {
    it('should execute sale when auction has a winning bidder and emit auction.sold', async () => {
      const openAuctionWithBid = {
        id: 1,
        sellerId: mockSeller.id,
        itemId: mockItem.id,
        qty: 1,
        currentBid: 300,
        currentBidderId: mockBidder1.id,
        status: 'OPEN',
        item: mockItem,
        seller: mockSeller,
        bidder: {
          ...mockBidder1,
          user: { discordId: 'discord-bidder' },
        },
      } as unknown as AuctionWithRelations;

      mockPrismaService.auction.findUnique.mockResolvedValue(
        openAuctionWithBid,
      );
      mockPrismaService.auction.update.mockResolvedValue({
        ...openAuctionWithBid,
        status: 'SOLD',
      });

      await service.settleAuction(1);

      // Seller receives escrowed gold
      expect(mockPrismaService.character.update).toHaveBeenCalledWith({
        where: { id: mockSeller.id },
        data: { gold: { increment: 300 } },
      });

      // Buyer receives items
      expect(mockPrismaService.inventory.upsert).toHaveBeenCalledWith({
        where: {
          charId_itemId: {
            charId: mockBidder1.id,
            itemId: mockItem.id,
          },
        },
        create: {
          charId: mockBidder1.id,
          itemId: mockItem.id,
          qty: 1,
        },
        update: {
          qty: { increment: 1 },
        },
      });

      // Event emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auction.sold', {
        auction: openAuctionWithBid,
        buyer: openAuctionWithBid.bidder,
      });
    });

    it('should refund items to seller when auction expires with no bids and emit auction.expired', async () => {
      const openExpiredAuction = {
        id: 2,
        sellerId: mockSeller.id,
        itemId: mockItem.id,
        qty: 3,
        currentBid: null,
        currentBidderId: null,
        status: 'OPEN',
        item: mockItem,
        seller: mockSeller,
        bidder: null,
      } as unknown as AuctionWithRelations;

      mockPrismaService.auction.findUnique.mockResolvedValue(
        openExpiredAuction,
      );
      mockPrismaService.auction.update.mockResolvedValue({
        ...openExpiredAuction,
        status: 'EXPIRED',
      });

      await service.settleAuction(2);

      // Items returned to seller
      expect(mockPrismaService.inventory.upsert).toHaveBeenCalledWith({
        where: {
          charId_itemId: {
            charId: mockSeller.id,
            itemId: mockItem.id,
          },
        },
        create: {
          charId: mockSeller.id,
          itemId: mockItem.id,
          qty: 3,
        },
        update: {
          qty: { increment: 3 },
        },
      });

      // Event emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auction.expired', {
        auction: openExpiredAuction,
      });
    });
  });
});
