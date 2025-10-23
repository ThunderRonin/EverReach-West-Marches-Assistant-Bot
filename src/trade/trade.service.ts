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
import {
  TRADE_EXPIRY_MINUTES,
  INITIAL_OFFER,
  TRADE_STATUS,
  TRADE_ERROR_MESSAGES,
} from '../config/trade.config';
import {
  CreateTradeSchema,
  AddToTradeOfferSchema,
  AcceptTradeSchema,
  TradeOfferSchema,
  type TradeOffer,
} from '../config/validation.schemas';
import { validateInteger } from '../common/sanitization.util';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startTrade(fromCharId: number, toCharId: number) {
    // Validate input parameters
    const validated = CreateTradeSchema.parse({
      fromCharId,
      toCharId,
    });

    // Check if there's already a pending trade
    const existingTrade = await this.prisma.trade.findFirst({
      where: {
        OR: [
          { fromCharId: validated.fromCharId, status: TRADE_STATUS.PENDING },
          { toCharId: validated.toCharId, status: TRADE_STATUS.PENDING },
        ],
      },
    });

    if (existingTrade) {
      throw new BadRequestException(
        TRADE_ERROR_MESSAGES.PENDING_TRADE_EXISTS,
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TRADE_EXPIRY_MINUTES);

    const trade = await this.prisma.trade.create({
      data: {
        fromCharId: validated.fromCharId,
        toCharId: validated.toCharId,
        offerFrom: JSON.stringify(INITIAL_OFFER),
        offerTo: JSON.stringify(INITIAL_OFFER),
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
    // Sanitize inputs
    validateInteger(tradeId, 1);
    validateInteger(characterId, 1);

    if (type === 'gold' && qty !== undefined) {
      validateInteger(qty, 0, 1000000);
    }

    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException(TRADE_ERROR_MESSAGES.TRADE_NOT_FOUND);
    }

    if (trade.status !== TRADE_STATUS.PENDING) {
      throw new BadRequestException(TRADE_ERROR_MESSAGES.TRADE_NOT_PENDING);
    }

    if (new Date() > trade.expiresAt) {
      throw new BadRequestException(TRADE_ERROR_MESSAGES.TRADE_EXPIRED);
    }

    if (characterId !== trade.fromCharId && characterId !== trade.toCharId) {
      throw new BadRequestException(
        TRADE_ERROR_MESSAGES.NOT_TRADE_PARTICIPANT,
      );
    }

    const isFromChar = characterId === trade.fromCharId;
    const currentOffer = isFromChar
      ? TradeOfferSchema.parse(JSON.parse(trade.offerFrom))
      : TradeOfferSchema.parse(JSON.parse(trade.offerTo));

    if (type === 'gold') {
      if (!qty || qty <= 0) {
        throw new BadRequestException(TRADE_ERROR_MESSAGES.INVALID_GOLD_AMOUNT);
      }

      // Check if character has enough gold
      const character = await this.prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character || character.gold < currentOffer.gold + qty) {
        throw new InsufficientGoldError();
      }

      currentOffer.gold += qty;
    } else if (type === 'item') {
      if (!key || !qty || qty <= 0) {
        throw new BadRequestException(
          TRADE_ERROR_MESSAGES.INVALID_ITEM_PARAMETERS,
        );
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
        throw new InsufficientItemsError();
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
    // Validate input parameters
    AcceptTradeSchema.parse({
      tradeId,
      characterId,
    });

    return this.prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new NotFoundException(TRADE_ERROR_MESSAGES.TRADE_NOT_FOUND);
      }

      if (trade.status !== TRADE_STATUS.PENDING) {
        throw new BadRequestException(TRADE_ERROR_MESSAGES.TRADE_NOT_PENDING);
      }

      if (new Date() > trade.expiresAt) {
        throw new BadRequestException(TRADE_ERROR_MESSAGES.TRADE_EXPIRED);
      }

      // Only the "to" character can accept
      if (characterId !== trade.toCharId) {
        throw new BadRequestException(TRADE_ERROR_MESSAGES.NOT_RECIPIENT);
      }

      const offerFrom = TradeOfferSchema.parse(JSON.parse(trade.offerFrom));
      const offerTo = TradeOfferSchema.parse(JSON.parse(trade.offerTo));

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
        throw new BadRequestException(
          TRADE_ERROR_MESSAGES.CHARACTER_NOT_FOUND,
        );
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
    this.logger.debug(`[Trade ${trade.id}] Starting trade execution between characters ${trade.fromCharId} and ${trade.toCharId}`);

    // Update gold - correctly swap between both characters
    // Character sending offer loses their gold amount and gains the other's amount
    this.logger.debug(`[Trade ${trade.id}] Decrementing gold for fromChar (${trade.fromCharId}): ${offerFrom.gold}`);
    await tx.character.update({
      where: { id: trade.fromCharId },
      data: {
        gold: {
          decrement: offerFrom.gold,
        },
      },
    });

    this.logger.debug(`[Trade ${trade.id}] Incrementing gold for fromChar (${trade.fromCharId}): ${offerTo.gold}`);
    await tx.character.update({
      where: { id: trade.fromCharId },
      data: {
        gold: {
          increment: offerTo.gold,
        },
      },
    });

    // Character receiving offer loses their gold amount and gains the other's amount
    this.logger.debug(`[Trade ${trade.id}] Decrementing gold for toChar (${trade.toCharId}): ${offerTo.gold}`);
    await tx.character.update({
      where: { id: trade.toCharId },
      data: {
        gold: {
          decrement: offerTo.gold,
        },
      },
    });

    this.logger.debug(`[Trade ${trade.id}] Incrementing gold for toChar (${trade.toCharId}): ${offerFrom.gold}`);
    await tx.character.update({
      where: { id: trade.toCharId },
      data: {
        gold: {
          increment: offerFrom.gold,
        },
      },
    });

    this.logger.debug(`[Trade ${trade.id}] Gold transfers completed successfully`);

    // Transfer items from fromChar to toChar
    // Items are already verified to exist in verifyTradeRequirements
    this.logger.debug(`[Trade ${trade.id}] Starting item transfer from fromChar to toChar (${offerFrom.items.length} item types)`);
    for (const offerItem of offerFrom.items) {
      // Decrease quantity for seller
      this.logger.debug(`[Trade ${trade.id}] Decreasing inventory for fromChar (${trade.fromCharId}): itemId=${offerItem.itemId}, qty=${offerItem.qty}`);
      await tx.inventory.update({
        where: {
          charId_itemId: {
            charId: trade.fromCharId,
            itemId: offerItem.itemId,
          },
        },
        data: { qty: { decrement: offerItem.qty } },
      });

      // Increase quantity for buyer
      this.logger.debug(`[Trade ${trade.id}] Increasing inventory for toChar (${trade.toCharId}): itemId=${offerItem.itemId}, qty=${offerItem.qty}`);
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
    this.logger.debug(`[Trade ${trade.id}] Starting item transfer from toChar to fromChar (${offerTo.items.length} item types)`);
    for (const offerItem of offerTo.items) {
      // Decrease quantity for seller
      this.logger.debug(`[Trade ${trade.id}] Decreasing inventory for toChar (${trade.toCharId}): itemId=${offerItem.itemId}, qty=${offerItem.qty}`);
      await tx.inventory.update({
        where: {
          charId_itemId: {
            charId: trade.toCharId,
            itemId: offerItem.itemId,
          },
        },
        data: { qty: { decrement: offerItem.qty } },
      });

      // Increase quantity for buyer
      this.logger.debug(`[Trade ${trade.id}] Increasing inventory for fromChar (${trade.fromCharId}): itemId=${offerItem.itemId}, qty=${offerItem.qty}`);
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
    this.logger.debug(`[Trade ${trade.id}] Marking trade status as EXECUTED`);
    await tx.trade.update({
      where: { id: trade.id },
      data: { status: TRADE_STATUS.EXECUTED },
    });

    // Log transactions
    this.logger.debug(`[Trade ${trade.id}] Creating transaction log for fromChar (${trade.fromCharId})`);
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

    this.logger.debug(`[Trade ${trade.id}] Creating transaction log for toChar (${trade.toCharId})`);
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

    this.logger.log(
      `[Trade ${trade.id}] Trade settlement completed successfully between ${trade.fromCharId} and ${trade.toCharId}. Gold: ${offerFrom.gold}, Items: ${offerFrom.items.length}`,
    );
  }

  async cleanupExpiredTrades() {
    const result = await this.prisma.trade.updateMany({
      where: {
        status: TRADE_STATUS.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: TRADE_STATUS.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired trades`);
    }

    return result.count;
  }
}
