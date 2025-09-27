import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

type AuctionWithRelations = Prisma.AuctionGetPayload<{
  include: {
    item: true;
    seller: true;
    bidder: true;
  };
}>;

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Start heartbeat every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      this.processExpiredAuctions().catch((error) => {
        this.logger.error('Error processing expired auctions:', error);
      });
    }, 10000);
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  async createAuction(
    sellerId: number,
    itemKey: string,
    qty: number,
    minBid: number,
    minutes: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verify item exists
      const item = await tx.item.findUnique({
        where: { key: itemKey },
      });

      if (!item) {
        throw new BadRequestException('Item not found');
      }

      // Verify seller has enough items
      const inventory = await tx.inventory.findUnique({
        where: {
          charId_itemId: {
            charId: sellerId,
            itemId: item.id,
          },
        },
      });

      if (!inventory || inventory.qty < qty) {
        throw new BadRequestException('Insufficient items to auction');
      }

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + minutes);

      // Create auction
      const auction = await tx.auction.create({
        data: {
          sellerId,
          itemId: item.id,
          qty,
          minBid,
          expiresAt,
        },
        include: {
          item: true,
          seller: true,
        },
      });

      // Remove items from seller's inventory
      await tx.inventory.update({
        where: {
          charId_itemId: {
            charId: sellerId,
            itemId: item.id,
          },
        },
        data: {
          qty: {
            decrement: qty,
          },
        },
      });

      this.logger.log(
        `Created auction ${auction.id} for ${qty}x ${item.name} starting at ${minBid} gold`,
      );
      return auction;
    });
  }

  async placeBid(auctionId: number, bidderId: number, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          item: true,
          seller: true,
          bidder: true,
        },
      });

      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      if (auction.status !== 'OPEN') {
        throw new BadRequestException('Auction is not open');
      }

      if (new Date() > auction.expiresAt) {
        throw new BadRequestException('Auction has expired');
      }

      if (auction.sellerId === bidderId) {
        throw new BadRequestException('You cannot bid on your own auction');
      }

      if (amount < auction.minBid) {
        throw new BadRequestException('Bid must be at least the minimum bid');
      }

      if (auction.currentBid && amount <= auction.currentBid) {
        throw new BadRequestException('Bid must be higher than current bid');
      }

      // Verify bidder has enough gold
      const bidder = await tx.character.findUnique({
        where: { id: bidderId },
      });

      if (!bidder || bidder.gold < amount) {
        throw new BadRequestException('Insufficient gold');
      }

      // Update auction
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentBid: amount,
          currentBidderId: bidderId,
        },
      });

      // Create bid record
      await tx.bid.create({
        data: {
          auctionId,
          bidderId,
          amount,
        },
      });

      this.logger.log(
        `Bid placed on auction ${auctionId}: ${amount} gold by character ${bidderId}`,
      );
      return auction;
    });
  }

  async getActiveAuctions() {
    return this.prisma.auction.findMany({
      where: {
        status: 'OPEN',
        expiresAt: { gt: new Date() },
      },
      include: {
        item: true,
        seller: true,
        bidder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserAuctions(characterId: number) {
    const [createdAuctions, bids] = await Promise.all([
      this.prisma.auction.findMany({
        where: { sellerId: characterId },
        include: {
          item: true,
          bidder: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bid.findMany({
        where: { bidderId: characterId },
        include: {
          auction: {
            include: {
              item: true,
              seller: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      createdAuctions,
      bids,
    };
  }

  private async processExpiredAuctions() {
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'OPEN',
        expiresAt: { lte: new Date() },
      },
      include: {
        item: true,
        seller: true,
        bidder: true,
      },
    });

    for (const auction of expiredAuctions) {
      await this.settleAuction(auction);
    }

    if (expiredAuctions.length > 0) {
      this.logger.log(`Processed ${expiredAuctions.length} expired auctions`);
    }
  }

  private async settleAuction(auction: AuctionWithRelations) {
    await this.prisma.$transaction(async (tx) => {
      // Re-check auction status to avoid race conditions
      const currentAuction = await tx.auction.findUnique({
        where: { id: auction.id },
      });

      if (!currentAuction || currentAuction.status !== 'OPEN') {
        return; // Already processed
      }

      if (currentAuction.currentBidderId) {
        // Auction was sold
        await this.executeSale(tx, auction);
      } else {
        // Auction expired with no bids
        await this.refundSeller(tx, auction);
      }
    });
  }

  private async executeSale(
    tx: Prisma.TransactionClient,
    auction: AuctionWithRelations,
  ) {
    if (!auction.currentBidderId || auction.currentBid === null) {
      this.logger.warn(
        `Cannot execute sale for auction ${auction.id} without a valid bidder or bid amount`,
      );
      return;
    }

    // Transfer gold from bidder to seller
    await tx.character.update({
      where: { id: auction.currentBidderId },
      data: { gold: { decrement: auction.currentBid } },
    });

    await tx.character.update({
      where: { id: auction.sellerId },
      data: { gold: { increment: auction.currentBid } },
    });

    // Transfer items to bidder
    await tx.inventory.upsert({
      where: {
        charId_itemId: {
          charId: auction.currentBidderId,
          itemId: auction.itemId,
        },
      },
      update: { qty: { increment: auction.qty } },
      create: {
        charId: auction.currentBidderId,
        itemId: auction.itemId,
        qty: auction.qty,
      },
    });

    // Mark auction as sold
    await tx.auction.update({
      where: { id: auction.id },
      data: { status: 'SOLD' },
    });

    // Log transactions
    await tx.txLog.create({
      data: {
        charId: auction.sellerId,
        type: 'AUCTION_SALE',
        payload: JSON.stringify({
          auctionId: auction.id,
          itemId: auction.itemId,
          qty: auction.qty,
          salePrice: auction.currentBid,
          buyerId: auction.currentBidderId,
        }),
      },
    });

    await tx.txLog.create({
      data: {
        charId: auction.currentBidderId,
        type: 'AUCTION_SALE',
        payload: JSON.stringify({
          auctionId: auction.id,
          itemId: auction.itemId,
          qty: auction.qty,
          salePrice: auction.currentBid,
          sellerId: auction.sellerId,
        }),
      },
    });

    // Emit event for Discord notification
    this.eventEmitter.emit('auction.sold', {
      auction,
      buyer: auction.bidder,
    });
  }

  private async refundSeller(
    tx: Prisma.TransactionClient,
    auction: AuctionWithRelations,
  ) {
    // Return items to seller
    await tx.inventory.upsert({
      where: {
        charId_itemId: {
          charId: auction.sellerId,
          itemId: auction.itemId,
        },
      },
      update: { qty: { increment: auction.qty } },
      create: {
        charId: auction.sellerId,
        itemId: auction.itemId,
        qty: auction.qty,
      },
    });

    // Mark auction as expired
    await tx.auction.update({
      where: { id: auction.id },
      data: { status: 'EXPIRED' },
    });

    // Log transaction
    await tx.txLog.create({
      data: {
        charId: auction.sellerId,
        type: 'AUCTION_REFUND',
        payload: JSON.stringify({
          auctionId: auction.id,
          itemId: auction.itemId,
          qty: auction.qty,
          reason: 'No bids received',
        }),
      },
    });

    // Emit event for Discord notification
    this.eventEmitter.emit('auction.expired', {
      auction,
    });
  }
}
