import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Trade } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import {
  InsufficientGoldError,
  InsufficientItemsError,
  ItemNotFoundError,
} from '../core/errors/errors';

export interface TradeOffer {
  items: Array<{ itemId: number; qty: number }>;
  gold: number;
}

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);
  private readonly tradeExpiryMinutes = 30;

  constructor(private readonly prisma: PrismaService) {}

  async startTrade(fromCharId: number, toCharId: number) {
    // Check if there's already a pending trade
    const existingTrade = await this.prisma.trade.findFirst({
      where: {
        OR: [
          { fromCharId, status: 'PENDING' },
          { toCharId, status: 'PENDING' },
        ],
      },
    });

    if (existingTrade) {
      throw new BadRequestException(
        'One of the characters already has a pending trade',
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.tradeExpiryMinutes);

    const trade = await this.prisma.trade.create({
      data: {
        fromCharId,
        toCharId,
        offerFrom: JSON.stringify({ items: [], gold: 0 }),
        offerTo: JSON.stringify({ items: [], gold: 0 }),
        expiresAt,
      },
    });

    this.logger.log(
      `Started trade ${trade.id} between characters ${fromCharId} and ${toCharId}`,
    );
    return trade;
  }

  async addToTradeOffer(
    tradeId: number,
    characterId: number,
    type: 'item' | 'gold',
    key?: string,
    qty?: number,
  ) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== 'PENDING') {
      throw new BadRequestException('Trade is not pending');
    }

    if (new Date() > trade.expiresAt) {
      throw new BadRequestException('Trade has expired');
    }

    if (characterId !== trade.fromCharId && characterId !== trade.toCharId) {
      throw new BadRequestException('You are not part of this trade');
    }

    const isFromChar = characterId === trade.fromCharId;
    const currentOffer = isFromChar
      ? (JSON.parse(trade.offerFrom) as TradeOffer)
      : (JSON.parse(trade.offerTo) as TradeOffer);

    if (type === 'gold') {
      if (!qty || qty <= 0) {
        throw new BadRequestException('Invalid gold amount');
      }

      // Check if character has enough gold
      const character = await this.prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character || character.gold < currentOffer.gold + qty) {
        throw new BadRequestException('Insufficient gold');
      }

      currentOffer.gold += qty;
    } else if (type === 'item') {
      if (!key || !qty || qty <= 0) {
        throw new BadRequestException('Invalid item parameters');
      }

      const item = await this.prisma.item.findUnique({
        where: { key },
      });

      if (!item) {
        throw new ItemNotFoundError(key);
      }

      // Check if character has enough items
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          charId_itemId: {
            charId: characterId,
            itemId: item.id,
          },
        },
      });

      const currentQty = inventory?.qty || 0;
      const offeredQty =
        currentOffer.items.find((i) => i.itemId === item.id)?.qty || 0;

      if (currentQty < offeredQty + qty) {
        throw new BadRequestException('Insufficient items');
      }

      // Add to offer
      const existingItemIndex = currentOffer.items.findIndex(
        (i) => i.itemId === item.id,
      );
      if (existingItemIndex >= 0) {
        currentOffer.items[existingItemIndex].qty += qty;
      } else {
        currentOffer.items.push({ itemId: item.id, qty });
      }
    }

    // Update trade
    const updatedTrade = await this.prisma.trade.update({
      where: { id: tradeId },
      data: isFromChar
        ? { offerFrom: JSON.stringify(currentOffer) }
        : { offerTo: JSON.stringify(currentOffer) },
    });

    this.logger.log(
      `Updated trade ${tradeId} offer for character ${characterId}`,
    );
    return updatedTrade;
  }

  async getTrade(tradeId: number) {
    return this.prisma.trade.findUnique({
      where: { id: tradeId },
    });
  }

  async getPendingTradeByCharacter(characterId: number) {
    return this.prisma.trade.findFirst({
      where: {
        OR: [
          { fromCharId: characterId, status: 'PENDING' },
          { toCharId: characterId, status: 'PENDING' },
        ],
      },
    });
  }

  async acceptTrade(tradeId: number, characterId: number) {
    return this.prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new NotFoundException('Trade not found');
      }

      if (trade.status !== 'PENDING') {
        throw new BadRequestException('Trade is not pending');
      }

      if (new Date() > trade.expiresAt) {
        throw new BadRequestException('Trade has expired');
      }

      // Only the "to" character can accept
      if (characterId !== trade.toCharId) {
        throw new BadRequestException(
          'Only the recipient can accept the trade',
        );
      }

      const offerFrom = JSON.parse(trade.offerFrom) as TradeOffer;
      const offerTo = JSON.parse(trade.offerTo) as TradeOffer;

      // Get both characters with their inventory
      const [fromChar, toChar] = await Promise.all([
        tx.character.findUnique({
          where: { id: trade.fromCharId },
          include: { inventory: true },
        }),
        tx.character.findUnique({
          where: { id: trade.toCharId },
          include: { inventory: true },
        }),
      ]);

      if (!fromChar || !toChar) {
        throw new BadRequestException('Character not found');
      }

      // Verify both sides have required items and gold
      this.verifyTradeRequirements(fromChar, offerFrom, toChar, offerTo);

      // Execute the trade
      await this.executeTradeSwap(tx, trade, offerFrom, offerTo);

      this.logger.log(`Trade ${tradeId} executed successfully`);
      return trade;
    });
  }

  private verifyTradeRequirements(
    fromChar: {
      gold: number;
      inventory: Array<{ itemId: number; qty: number }>;
    },
    fromOffer: TradeOffer,
    toChar: { gold: number; inventory: Array<{ itemId: number; qty: number }> },
    toOffer: TradeOffer,
  ) {
    // Verify fromChar has required items and gold
    if (fromChar.gold < fromOffer.gold) {
      throw new InsufficientGoldError();
    }

    for (const offerItem of fromOffer.items) {
      const inventory = fromChar.inventory.find(
        (inv) => inv.itemId === offerItem.itemId,
      );
      const qty = inventory?.qty || 0;
      if (qty < offerItem.qty) {
        throw new InsufficientItemsError();
      }
    }

    // Verify toChar has required items and gold
    if (toChar.gold < toOffer.gold) {
      throw new InsufficientGoldError();
    }

    for (const offerItem of toOffer.items) {
      const inventory = toChar.inventory.find(
        (inv) => inv.itemId === offerItem.itemId,
      );
      const qty = inventory?.qty || 0;
      if (qty < offerItem.qty) {
        throw new InsufficientItemsError();
      }
    }
  }

  private async executeTradeSwap(
    tx: Prisma.TransactionClient,
    trade: Trade,
    offerFrom: TradeOffer,
    offerTo: TradeOffer,
  ) {
    // Update gold
    await tx.character.update({
      where: { id: trade.fromCharId },
      data: { gold: { decrement: offerFrom.gold } },
    });

    await tx.character.update({
      where: { id: trade.fromCharId },
      data: { gold: { increment: offerTo.gold } },
    });

    await tx.character.update({
      where: { id: trade.toCharId },
      data: { gold: { decrement: offerTo.gold } },
    });

    await tx.character.update({
      where: { id: trade.toCharId },
      data: { gold: { increment: offerFrom.gold } },
    });

    // Transfer items from fromChar to toChar
    for (const offerItem of offerFrom.items) {
      await tx.inventory.upsert({
        where: {
          charId_itemId: {
            charId: trade.fromCharId,
            itemId: offerItem.itemId,
          },
        },
        update: { qty: { decrement: offerItem.qty } },
        create: {
          charId: trade.fromCharId,
          itemId: offerItem.itemId,
          qty: -offerItem.qty,
        },
      });

      await tx.inventory.upsert({
        where: {
          charId_itemId: {
            charId: trade.toCharId,
            itemId: offerItem.itemId,
          },
        },
        update: { qty: { increment: offerItem.qty } },
        create: {
          charId: trade.toCharId,
          itemId: offerItem.itemId,
          qty: offerItem.qty,
        },
      });
    }

    // Transfer items from toChar to fromChar
    for (const offerItem of offerTo.items) {
      await tx.inventory.upsert({
        where: {
          charId_itemId: {
            charId: trade.toCharId,
            itemId: offerItem.itemId,
          },
        },
        update: { qty: { decrement: offerItem.qty } },
        create: {
          charId: trade.toCharId,
          itemId: offerItem.itemId,
          qty: -offerItem.qty,
        },
      });

      await tx.inventory.upsert({
        where: {
          charId_itemId: {
            charId: trade.fromCharId,
            itemId: offerItem.itemId,
          },
        },
        update: { qty: { increment: offerItem.qty } },
        create: {
          charId: trade.fromCharId,
          itemId: offerItem.itemId,
          qty: offerItem.qty,
        },
      });
    }

    // Mark trade as executed
    await tx.trade.update({
      where: { id: trade.id },
      data: { status: 'EXECUTED' },
    });

    // Log transactions
    await tx.txLog.create({
      data: {
        charId: trade.fromCharId,
        type: 'TRADE',
        payload: JSON.stringify({
          tradeId: trade.id,
          offerSent: offerFrom,
          offerReceived: offerTo,
          partnerCharId: trade.toCharId,
        }),
      },
    });

    await tx.txLog.create({
      data: {
        charId: trade.toCharId,
        type: 'TRADE',
        payload: JSON.stringify({
          tradeId: trade.id,
          offerSent: offerTo,
          offerReceived: offerFrom,
          partnerCharId: trade.fromCharId,
        }),
      },
    });
  }

  async cleanupExpiredTrades() {
    const result = await this.prisma.trade.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired trades`);
    }

    return result.count;
  }
}
