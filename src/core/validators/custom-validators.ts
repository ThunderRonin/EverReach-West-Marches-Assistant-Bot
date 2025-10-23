/**
 * Custom Validation Constraints
 * Business logic validators for complex validation rules
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

/**
 * Validates that an item with the given key exists in the database
 */
@ValidatorConstraint({ name: 'itemExists', async: true })
@Injectable()
export class ItemExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(itemKey: string): Promise<boolean> {
    if (typeof itemKey !== 'string') {
      return false;
    }

    const item = await this.prisma.item.findUnique({
      where: { key: itemKey.toLowerCase() },
    });

    return !!item;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Item '${args.value}' does not exist`;
  }
}

/**
 * Decorator for ItemExistsConstraint
 */
export function ItemExists(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ItemExistsConstraint,
    });
  };
}

/**
 * Validates that a character exists in the database
 */
@ValidatorConstraint({ name: 'characterExists', async: true })
@Injectable()
export class CharacterExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(characterId: number): Promise<boolean> {
    if (typeof characterId !== 'number' || characterId <= 0) {
      return false;
    }

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    return !!character;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Character with ID ${args.value} does not exist`;
  }
}

/**
 * Decorator for CharacterExistsConstraint
 */
export function CharacterExists(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CharacterExistsConstraint,
    });
  };
}

/**
 * Validates that a trade exists in the database
 */
@ValidatorConstraint({ name: 'tradeExists', async: true })
@Injectable()
export class TradeExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(tradeId: number): Promise<boolean> {
    if (typeof tradeId !== 'number' || tradeId <= 0) {
      return false;
    }

    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    return !!trade;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Trade with ID ${args.value} does not exist`;
  }
}

/**
 * Decorator for TradeExistsConstraint
 */
export function TradeExists(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: TradeExistsConstraint,
    });
  };
}

/**
 * Validates that an auction exists in the database
 */
@ValidatorConstraint({ name: 'auctionExists', async: true })
@Injectable()
export class AuctionExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(auctionId: number): Promise<boolean> {
    if (typeof auctionId !== 'number' || auctionId <= 0) {
      return false;
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    return !!auction;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Auction with ID ${args.value} does not exist`;
  }
}

/**
 * Decorator for AuctionExistsConstraint
 */
export function AuctionExists(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: AuctionExistsConstraint,
    });
  };
}

/**
 * Validates that a character has sufficient gold
 * Second parameter is field name in args.object containing the amount to validate
 */
@ValidatorConstraint({ name: 'hasSufficientGold', async: true })
@Injectable()
export class HasSufficientGoldConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    characterId: number,
    args: ValidationArguments,
  ): Promise<boolean> {
    if (typeof characterId !== 'number' || characterId <= 0) {
      return false;
    }

    const amountField = args.constraints[0] || 'amount';
    const amount = args.object[amountField];

    if (typeof amount !== 'number' || amount <= 0) {
      return false;
    }

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    return character ? character.gold >= amount : false;
  }

  defaultMessage(args: ValidationArguments): string {
    const amount = args.object[args.constraints[0] || 'amount'];
    return `Character does not have sufficient gold (needs ${amount})`;
  }
}

/**
 * Decorator for HasSufficientGoldConstraint
 * @param amountField - Field name containing the amount to validate against
 */
export function HasSufficientGold(
  amountField: string = 'amount',
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [amountField],
      validator: HasSufficientGoldConstraint,
    });
  };
}

/**
 * Validates that a character has sufficient items of a specific type
 */
@ValidatorConstraint({ name: 'hasSufficientItems', async: true })
@Injectable()
export class HasSufficientItemsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    characterId: number,
    args: ValidationArguments,
  ): Promise<boolean> {
    if (typeof characterId !== 'number' || characterId <= 0) {
      return false;
    }

    const itemKeyField = args.constraints[0] || 'itemKey';
    const quantityField = args.constraints[1] || 'quantity';
    const itemKey = args.object[itemKeyField];
    const quantity = args.object[quantityField];

    if (typeof itemKey !== 'string' || typeof quantity !== 'number') {
      return false;
    }

    const item = await this.prisma.item.findUnique({
      where: { key: itemKey.toLowerCase() },
    });

    if (!item) {
      return false;
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: {
        charId_itemId: {
          charId: characterId,
          itemId: item.id,
        },
      },
    });

    return inventory ? inventory.qty >= quantity : false;
  }

  defaultMessage(args: ValidationArguments): string {
    const itemKey = args.object[args.constraints[0] || 'itemKey'];
    const quantity = args.object[args.constraints[1] || 'quantity'];
    return `Character does not have ${quantity} of item '${itemKey}'`;
  }
}

/**
 * Decorator for HasSufficientItemsConstraint
 * @param itemKeyField - Field name containing the item key
 * @param quantityField - Field name containing the quantity
 */
export function HasSufficientItems(
  itemKeyField: string = 'itemKey',
  quantityField: string = 'quantity',
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [itemKeyField, quantityField],
      validator: HasSufficientItemsConstraint,
    });
  };
}
