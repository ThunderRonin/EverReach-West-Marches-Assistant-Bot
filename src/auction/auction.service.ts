import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SYSTEM_CONFIG, AUCTION_CONFIG } from '../config/game.constants';
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
import {
  AUCTION_CHECK_INTERVAL,
  AUCTION_STATUS,
  AUCTION_TRANSACTION_TYPES,
  AUCTION_ERROR_MESSAGES,
  AUCTION_CONSTRAINTS,
} from '../config/auction.config';
import {
  CreateAuctionSchema,
  PlaceBidSchema,
} from '../config/validation.schemas';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAuction(
    sellerId: number,
    itemKey: string,
    qty: number,
    minBid: number,
    minutes: number,
  ) {
    // Validate input parameters
    const validated = CreateAuctionSchema.parse({
      sellerId,
      itemKey,
      qty,
      minBid,
      minutes,
    });

    return this.prisma.$transaction(async (tx) => {
      // Verify item exists
      const item = await tx.item.findUnique({
        where: { key: validated.itemKey },
      });

      if (!item) {
        throw new ItemNotFoundError(validated.itemKey);
      }

      // Verify seller has enough items
      const inventory = await tx.inventory.findUnique({
        where: {
          charId_itemId: {
            charId: validated.sellerId,
            itemId: item.id,
          },
        },
      });

      if (!inventory || inventory.qty < validated.qty) {
        throw new InsufficientItemsError();
      }

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + validated.minutes);

      // Create auction
      const auction = await tx.auction.create({
        data: {
          sellerId: validated.sellerId,
          itemId: item.id,
          qty: validated.qty,
          minBid: validated.minBid,
          expiresAt,
          status: AUCTION_STATUS.OPEN,
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
            charId: validated.sellerId,
            itemId: item.id,
          },
        },
        data: {
          qty: {
            decrement: validated.qty,
          },
        },
      });

      this.logger.log(
        `Created auction ${auction.id} for ${validated.qty}x ${item.name} starting at ${validated.minBid} gold`,
      );
      return auction;
    });
  }

  async placeBid(auctionId: number, bidderId: number, amount: number) {
    // Validate input parameters
    const validated = PlaceBidSchema.parse({
      auctionId,
      bidderId,
      amount,
    });

    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: validated.auctionId },
        include: {
          item: true,
          seller: true,
          bidder: true,
        },
      });

      if (!auction) {
        throw new AuctionNotFoundError(validated.auctionId);
      }

      if (auction.status !== AUCTION_STATUS.OPEN) {
        throw new AuctionNotOpenError(validated.auctionId);
      }

      if (new Date() > auction.expiresAt) {
        throw new AuctionExpiredError(validated.auctionId);
      }

      if (auction.sellerId === validated.bidderId) {
        throw new SelfBidError();
      }

      if (validated.amount < auction.minBid) {
        throw new BidTooLowError();
      }

      if (auction.currentBid && validated.amount <= auction.currentBid) {
        throw new BidNotHigherError();
      }

      // Verify bidder has enough gold
      const bidder = await tx.character.findUnique({
        where: { id: validated.bidderId },
      });

      if (!bidder || bidder.gold < validated.amount) {
        throw new InsufficientGoldError();
      }

      // Update auction
      await tx.auction.update({
        where: { id: validated.auctionId },
        data: {
          currentBid: validated.amount,
          currentBidderId: validated.bidderId,
        },
      });

      // Create bid record
      await tx.bid.create({
        data: {
          auctionId: validated.auctionId,
          bidderId: validated.bidderId,
          amount: validated.amount,
        },
      });

      this.logger.log(
        `Bid placed on auction ${validated.auctionId}: ${validated.amount} gold by character ${validated.bidderId}`,
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

  /**
   * Process expired auctions every 10 seconds
   * Uses @nestjs/schedule for reliable cron management with proper lifecycle handling
   */
  @Cron(SYSTEM_CONFIG.AUCTION_CHECK_CRON)
  private async processExpiredAuctions() {
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: AUCTION_STATUS.OPEN,
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
    const settledAuction = await this.prisma.$transaction(async (tx) => {
      // Re-check auction status to avoid race conditions
      const currentAuction = await tx.auction.findUnique({
        where: { id: auction.id },
        include: {
          item: true,
          seller: true,
          bidder: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!currentAuction || currentAuction.status !== 'OPEN') {
        this.logger.debug(
          `Auction ${auction.id} already settled (status: ${currentAuction?.status})`,
        );
        return null; // Already processed
      }

      if (currentAuction.currentBidderId) {
        // Auction was sold
        this.logger.log(
          `Settling auction ${currentAuction.id}: sold for ${currentAuction.currentBid} gold`,
        );
        await this.executeSale(tx, currentAuction);
      } else {
        // Auction expired with no bids
        this.logger.log(
          `Settling auction ${currentAuction.id}: expired with no bids`,
        );
        await this.refundSeller(tx, currentAuction);
      }

      return currentAuction;
    });

    // Emit events outside transaction so they have access to fresh data
    if (settledAuction) {
      if (settledAuction.currentBidderId) {
        this.eventEmitter.emit('auction.sold', {
          auction: settledAuction,
        });
      } else {
        this.eventEmitter.emit('auction.expired', {
          auction: settledAuction,
        });
      }
    }
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
      data: { status: AUCTION_STATUS.SOLD },
    });

    // Log transactions
    await tx.txLog.create({
      data: {
        charId: auction.sellerId,
        type: AUCTION_TRANSACTION_TYPES.AUCTION_SALE,
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
      data: { status: AUCTION_STATUS.EXPIRED },
    });

    // Log transaction
    await tx.txLog.create({
      data: {
        charId: auction.sellerId,
        type: AUCTION_TRANSACTION_TYPES.AUCTION_REFUND,
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

  /**
   * Store a Discord message ID for an auction
   * Used to later update the message when auction state changes
   */
  async storeMessageId(
    auctionId: number,
    messageId: string,
    channelId: string,
    guildId: string,
  ) {
    try {
      return await this.prisma.auctionMessage.create({
        data: {
          auctionId,
          messageId,
          channelId,
          guildId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to store message ID for auction ${auctionId}:`,
        error,
      );
      // Don't throw - message storage is non-critical
    }
  }

  /**
   * Update a stored auction message in Discord
   * Used to update the embed when bid is placed or auction settles
   */
  async updateAuctionMessage(
    auctionId: number,
    client: any, // Discord.js Client
    embed: any, // EmbedBuilder
  ) {
    try {
      const auctionMessage = await this.prisma.auctionMessage.findUnique({
        where: { auctionId },
      });

      if (!auctionMessage) {
        this.logger.debug(
          `No stored message ID for auction ${auctionId} - skipping update`,
        );
        return;
      }

      // Fetch channel and message from Discord
      const channel = await client.channels.fetch(auctionMessage.channelId);
      if (!channel || !channel.isTextBased()) {
        this.logger.warn(
          `Channel ${auctionMessage.channelId} not found or not text-based`,
        );
        return;
      }

      const message = await channel.messages.fetch(auctionMessage.messageId);
      if (!message) {
        this.logger.warn(
          `Message ${auctionMessage.messageId} not found in channel`,
        );
        return;
      }

      // Update the message
      await message.edit({ embeds: [embed] });
      this.logger.log(
        `Updated auction message ${auctionMessage.messageId} for auction ${auctionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update auction message for auction ${auctionId}:`,
        error,
      );
      // Don't throw - message update is non-critical
    }
  }

  /**
   * Delete stored message reference when auction is cleaned up
   */
  async deleteAuctionMessage(auctionId: number) {
    try {
      await this.prisma.auctionMessage.delete({
        where: { auctionId },
      });
    } catch (error) {
      this.logger.debug(
        `No message record to delete for auction ${auctionId}`,
      );
      // Silently fail - might not exist
    }
  }
}
