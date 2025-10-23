/**
 * Auction Configuration Constants
 * Centralized configuration for all auction-related operations
 */

/**
 * Cron schedule for checking and processing expired auctions
 * Default: Every 10 seconds
 */
export const AUCTION_CHECK_INTERVAL = 'EVERY_10_SECONDS';

/**
 * Batch size for processing expired auctions in a single check
 */
export const AUCTION_SETTLEMENT_BATCH_SIZE = 100;

/**
 * Validation constraints for auction creation and bidding
 */
export const AUCTION_CONSTRAINTS = {
  /** Minimum quantity of items to auction */
  MIN_QUANTITY: 1,
  /** Maximum quantity of items to auction */
  MAX_QUANTITY: 999_999,
  /** Minimum bid amount (in gold) */
  MIN_BID: 1,
  /** Maximum bid amount (prevent integer overflow) */
  MAX_BID: 999_999_999,
  /** Minimum auction duration (in minutes) */
  MIN_DURATION_MINUTES: 1,
  /** Maximum auction duration (in minutes) */
  MAX_DURATION_MINUTES: 10_080, // 7 days
  /** Default auction duration (in minutes) if not specified */
  DEFAULT_DURATION_MINUTES: 60,
} as const;

/**
 * Auction status enum values
 */
export const AUCTION_STATUS = {
  OPEN: 'OPEN',
  SOLD: 'SOLD',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Bid increment rules
 */
export const BID_INCREMENT_RULES = {
  /** Minimum amount a new bid must exceed the current bid by */
  MIN_INCREMENT: 1,
  /** Percentage-based minimum increment (e.g., 5% of current bid) */
  PERCENTAGE_INCREMENT: 0.05,
} as const;

/**
 * Transaction log types for auction operations
 */
export const AUCTION_TRANSACTION_TYPES = {
  AUCTION_SALE: 'AUCTION_SALE',
  AUCTION_REFUND: 'AUCTION_REFUND',
} as const;

/**
 * Error messages for auction operations
 */
export const AUCTION_ERROR_MESSAGES = {
  AUCTION_NOT_FOUND: 'Auction not found',
  AUCTION_NOT_OPEN: 'Auction is not open for bidding',
  AUCTION_EXPIRED: 'Auction has expired',
  ITEM_NOT_FOUND: 'Item not found',
  INSUFFICIENT_ITEMS: 'Seller does not have enough items',
  INSUFFICIENT_GOLD: 'You do not have enough gold for this bid',
  SELF_BID: 'You cannot bid on your own auction',
  BID_TOO_LOW: 'Your bid must be at least the minimum bid amount',
  BID_NOT_HIGHER: 'Your bid must be higher than the current highest bid',
  CHARACTER_NOT_FOUND: 'Character not found',
} as const;

/**
 * Pagination settings for auction queries
 */
export const AUCTION_PAGINATION = {
  /** Maximum number of active auctions to retrieve */
  MAX_ACTIVE_AUCTIONS: 100,
  /** Maximum number of user auctions to retrieve */
  MAX_USER_AUCTIONS: 50,
} as const;
