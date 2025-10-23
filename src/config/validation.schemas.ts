/**
 * Runtime Validation Schemas using Zod
 * Provides type-safe validation for all trade and auction operations
 */

import { z } from 'zod';
import { TRADE_OFFER_CONSTRAINTS } from './trade.config';
import { AUCTION_CONSTRAINTS } from './auction.config';

// ============================================================================
// TRADE SCHEMAS
// ============================================================================

/**
 * Schema for validating a single item in a trade offer
 * Ensures itemId is a positive integer and quantity is within constraints
 */
export const TradeOfferItemSchema = z.object({
  itemId: z.number().int().positive('Item ID must be a positive integer'),
  qty: z
    .number()
    .int()
    .min(
      TRADE_OFFER_CONSTRAINTS.MIN_ITEMS,
      `Quantity must be at least ${TRADE_OFFER_CONSTRAINTS.MIN_ITEMS}`,
    )
    .max(
      TRADE_OFFER_CONSTRAINTS.MAX_ITEM_QUANTITY,
      `Quantity cannot exceed ${TRADE_OFFER_CONSTRAINTS.MAX_ITEM_QUANTITY}`,
    ),
});

/**
 * Schema for validating a complete trade offer from one character
 * Includes gold amount and array of items being offered
 */
export const TradeOfferSchema = z.object({
  items: z
    .array(TradeOfferItemSchema)
    .max(
      TRADE_OFFER_CONSTRAINTS.MAX_ITEMS_PER_OFFER,
      `Cannot offer more than ${TRADE_OFFER_CONSTRAINTS.MAX_ITEMS_PER_OFFER} different items`,
    ),
  gold: z
    .number()
    .int()
    .min(
      TRADE_OFFER_CONSTRAINTS.MIN_GOLD,
      `Gold must be at least ${TRADE_OFFER_CONSTRAINTS.MIN_GOLD}`,
    )
    .max(
      TRADE_OFFER_CONSTRAINTS.MAX_GOLD,
      `Gold cannot exceed ${TRADE_OFFER_CONSTRAINTS.MAX_GOLD}`,
    ),
});

/**
 * Schema for validating trade initiation parameters
 */
export const CreateTradeSchema = z.object({
  fromCharId: z.number().int().positive('From character ID must be a positive integer'),
  toCharId: z.number().int().positive('To character ID must be a positive integer'),
});

/**
 * Schema for validating trade offer additions
 * Used when a player adds items or gold to their trade offer
 */
export const AddToTradeOfferSchema = z.object({
  tradeId: z.number().int().positive('Trade ID must be a positive integer'),
  characterId: z.number().int().positive('Character ID must be a positive integer'),
  type: z.enum(['item', 'gold']).describe("Type must be either 'item' or 'gold'"),
  itemKey: z.string().optional(),
  qty: z.number().int().positive().optional(),
});

/**
 * Schema for validating trade acceptance
 */
export const AcceptTradeSchema = z.object({
  tradeId: z.number().int().positive('Trade ID must be a positive integer'),
  characterId: z.number().int().positive('Character ID must be a positive integer'),
});

/**
 * Combined schema for complete trade validation after both parties have submitted offers
 */
export const CompletedTradeSchema = z.object({
  fromCharId: z.number().int().positive(),
  toCharId: z.number().int().positive(),
  offerFrom: TradeOfferSchema,
  offerTo: TradeOfferSchema,
});

// ============================================================================
// AUCTION SCHEMAS
// ============================================================================

/**
 * Schema for validating auction creation parameters
 */
export const CreateAuctionSchema = z.object({
  sellerId: z.number().int().positive('Seller ID must be a positive integer'),
  itemKey: z
    .string()
    .min(1, 'Item key is required')
    .max(255, 'Item key must be less than 255 characters'),
  qty: z
    .number()
    .int()
    .min(
      AUCTION_CONSTRAINTS.MIN_QUANTITY,
      `Quantity must be at least ${AUCTION_CONSTRAINTS.MIN_QUANTITY}`,
    )
    .max(
      AUCTION_CONSTRAINTS.MAX_QUANTITY,
      `Quantity cannot exceed ${AUCTION_CONSTRAINTS.MAX_QUANTITY}`,
    ),
  minBid: z
    .number()
    .int()
    .min(
      AUCTION_CONSTRAINTS.MIN_BID,
      `Minimum bid must be at least ${AUCTION_CONSTRAINTS.MIN_BID}`,
    )
    .max(
      AUCTION_CONSTRAINTS.MAX_BID,
      `Minimum bid cannot exceed ${AUCTION_CONSTRAINTS.MAX_BID}`,
    ),
  minutes: z
    .number()
    .int()
    .min(
      AUCTION_CONSTRAINTS.MIN_DURATION_MINUTES,
      `Duration must be at least ${AUCTION_CONSTRAINTS.MIN_DURATION_MINUTES} minute`,
    )
    .max(
      AUCTION_CONSTRAINTS.MAX_DURATION_MINUTES,
      `Duration cannot exceed ${AUCTION_CONSTRAINTS.MAX_DURATION_MINUTES} minutes`,
    ),
});

/**
 * Schema for validating bid placement parameters
 */
export const PlaceBidSchema = z.object({
  auctionId: z.number().int().positive('Auction ID must be a positive integer'),
  bidderId: z.number().int().positive('Bidder ID must be a positive integer'),
  amount: z
    .number()
    .int()
    .min(
      AUCTION_CONSTRAINTS.MIN_BID,
      `Bid must be at least ${AUCTION_CONSTRAINTS.MIN_BID}`,
    )
    .max(
      AUCTION_CONSTRAINTS.MAX_BID,
      `Bid cannot exceed ${AUCTION_CONSTRAINTS.MAX_BID}`,
    ),
});

// ============================================================================
// TRANSACTION LOG SCHEMAS
// ============================================================================

/**
 * Schema for validating buy transaction payloads
 */
export const BuyPayloadSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
  itemName: z.string().min(1, 'Item name is required'),
  totalCost: z.number().int().nonnegative('Total cost cannot be negative'),
  itemId: z.number().int().positive('Item ID must be positive'),
  itemKey: z.string().min(1, 'Item key is required'),
});

/**
 * Schema for validating trade transaction payloads
 */
export const TradePayloadSchema = z.object({
  partnerCharId: z.number().int().positive('Partner character ID must be positive'),
});

/**
 * Schema for validating auction sale transaction payloads
 */
export const AuctionSalePayloadSchema = z.object({
  qty: z.number().int().positive('Quantity must be positive'),
  salePrice: z.number().int().nonnegative('Sale price cannot be negative'),
});

/**
 * Schema for validating auction refund transaction payloads
 */
export const AuctionRefundPayloadSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * Combined schema for all transaction log payload types
 */
export const TxLogPayloadSchema = z.union([
  BuyPayloadSchema,
  TradePayloadSchema,
  AuctionSalePayloadSchema,
  AuctionRefundPayloadSchema,
]);

/**
 * Infer TypeScript types from Zod schemas for use throughout the application
 * Example: `type TradeOffer = z.infer<typeof TradeOfferSchema>`
 */
export type TradeOfferItem = z.infer<typeof TradeOfferItemSchema>;
export type TradeOffer = z.infer<typeof TradeOfferSchema>;
export type CreateTrade = z.infer<typeof CreateTradeSchema>;
export type AddToTradeOffer = z.infer<typeof AddToTradeOfferSchema>;
export type AcceptTrade = z.infer<typeof AcceptTradeSchema>;
export type CompletedTrade = z.infer<typeof CompletedTradeSchema>;
export type CreateAuction = z.infer<typeof CreateAuctionSchema>;
export type PlaceBid = z.infer<typeof PlaceBidSchema>;
export type BuyPayload = z.infer<typeof BuyPayloadSchema>;
export type TradePayload = z.infer<typeof TradePayloadSchema>;
export type AuctionSalePayload = z.infer<typeof AuctionSalePayloadSchema>;
export type AuctionRefundPayload = z.infer<typeof AuctionRefundPayloadSchema>;
export type TxLogPayload = z.infer<typeof TxLogPayloadSchema>;
