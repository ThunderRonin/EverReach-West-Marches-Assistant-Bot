/**
 * Trade Configuration Constants
 * Centralized configuration for all trade-related operations
 */

/**
 * Time before a pending trade expires (in minutes)
 * Default: 30 minutes
 */
export const TRADE_EXPIRY_MINUTES = 30;

/**
 * Maximum duration for a trade to complete (in minutes)
 * Default: 30 minutes (same as expiry)
 */
export const TRADE_TIMEOUT_MINUTES = 30;

/**
 * Initial offer values when starting a new trade
 */
export const INITIAL_OFFER = {
  gold: 0,
  items: [],
} as const;

/**
 * Validation constraints for trade offers
 */
export const TRADE_OFFER_CONSTRAINTS = {
  /** Minimum gold per trade */
  MIN_GOLD: 0,
  /** Maximum gold per single offer (prevent integer overflow) */
  MAX_GOLD: 999_999_999,
  /** Minimum items per trade */
  MIN_ITEMS: 0,
  /** Maximum items per single offer */
  MAX_ITEMS_PER_OFFER: 1000,
  /** Maximum quantity of a single item */
  MAX_ITEM_QUANTITY: 99_999,
} as const;

/**
 * Trade status enum values
 */
export const TRADE_STATUS = {
  PENDING: 'PENDING',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

/**
 * Transaction log types for trade operations
 */
export const TRANSACTION_LOG_TYPES = {
  TRADE: 'TRADE',
} as const;

/**
 * Error messages for trade operations
 */
export const TRADE_ERROR_MESSAGES = {
  TRADE_NOT_FOUND: 'Trade not found',
  TRADE_NOT_PENDING: 'Trade is not pending',
  TRADE_EXPIRED: 'Trade has expired',
  NOT_TRADE_PARTICIPANT: 'You are not part of this trade',
  INVALID_GOLD_AMOUNT: 'Invalid gold amount',
  INVALID_ITEM_PARAMETERS: 'Invalid item parameters',
  INSUFFICIENT_GOLD: 'Insufficient gold',
  INSUFFICIENT_ITEMS: 'Insufficient items',
  ITEM_NOT_FOUND: 'Item not found',
  PENDING_TRADE_EXISTS: 'One of the characters already has a pending trade',
  NOT_RECIPIENT: 'Only the trade recipient can accept the trade',
  CHARACTER_NOT_FOUND: 'Character not found',
} as const;

/**
 * Default pagination and batch settings
 */
export const TRADE_BATCH_SETTINGS = {
  /** Batch size for cleanup operations */
  CLEANUP_BATCH_SIZE: 100,
  /** Maximum number of trades to retrieve per query */
  MAX_RETRIEVE_LIMIT: 50,
} as const;
