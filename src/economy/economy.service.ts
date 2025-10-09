import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  ItemNotFoundError,
  InsufficientGoldError,
  CharacterNotFoundError,
} from '../core/errors/errors';

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buyItem(characterId: number, itemKey: string, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      // Get character and item
      const character = await tx.character.findUnique({
        where: { id: characterId },
        include: {
          inventory: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!character) {
        throw new CharacterNotFoundError();
      }

      const item = await tx.item.findUnique({
        where: { key: itemKey },
      });

      if (!item) {
        throw new ItemNotFoundError(itemKey);
      }

      const totalCost = item.baseValue * quantity;

      if (character.gold < totalCost) {
        throw new InsufficientGoldError();
      }

      // Update character gold
      await tx.character.update({
        where: { id: characterId },
        data: {
          gold: {
            decrement: totalCost,
          },
        },
      });

      // Update or create inventory entry
      await tx.inventory.upsert({
        where: {
          charId_itemId: {
            charId: characterId,
            itemId: item.id,
          },
        },
        update: {
          qty: {
            increment: quantity,
          },
        },
        create: {
          charId: characterId,
          itemId: item.id,
          qty: quantity,
        },
      });

      // Log transaction
      await tx.txLog.create({
        data: {
          charId: characterId,
          type: 'BUY',
          payload: JSON.stringify({
            itemId: item.id,
            itemKey: item.key,
            itemName: item.name,
            quantity,
            totalCost,
          }),
        },
      });

      this.logger.log(
        `Character ${characterId} bought ${quantity}x ${item.name} for ${totalCost} gold`,
      );

      return {
        item: item,
        quantity,
        totalCost,
        remainingGold: character.gold - totalCost,
      };
    });
  }

  async getCharacterInventory(characterId: number) {
    return this.prisma.inventory.findMany({
      where: { charId: characterId },
      include: {
        item: true,
      },
      orderBy: {
        item: {
          name: 'asc',
        },
      },
    });
  }

  async getTransactionHistory(characterId: number, limit = 10) {
    return this.prisma.txLog.findMany({
      where: { charId: characterId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAllItems() {
    return this.prisma.item.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getItemByKey(key: string) {
    return this.prisma.item.findUnique({
      where: { key },
    });
  }
}
