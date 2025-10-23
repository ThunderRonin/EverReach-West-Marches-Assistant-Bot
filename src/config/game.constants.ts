/**
 * Game Constants Configuration
 * Centralized business logic constants for the entire game system
 * These define the core game mechanics and economy
 */

/**
 * Character Creation and Progression
 */
export const CHARACTER_CONFIG = {
  /** Starting gold amount for new characters */
  STARTING_GOLD: 100,
  /** Maximum character name length (Discord username context) */
  MAX_NAME_LENGTH: 100,
  /** Minimum character name length */
  MIN_NAME_LENGTH: 1,
} as const;

/**
 * Economy System Configuration
 * Controls pricing, transaction limits, and value constraints
 */
export const ECONOMY_CONFIG = {
  /** Minimum gold amount that can be transferred in transactions */
  MIN_TRANSACTION_AMOUNT: 1,
  /** Maximum gold amount to prevent integer overflow */
  MAX_GOLD_AMOUNT: 999_999_999,
  /** Default transaction history limit (number of transactions to retrieve) */
  DEFAULT_HISTORY_LIMIT: 10,
  /** Maximum transaction history limit per query */
  MAX_HISTORY_LIMIT: 100,
  /** Default pagination size for item lists */
  DEFAULT_PAGE_SIZE: 50,
  /** Maximum pagination size to prevent DoS */
  MAX_PAGE_SIZE: 500,
} as const;

/**
 * Inventory Management
 */
export const INVENTORY_CONFIG = {
  /** Minimum quantity of items that can be in inventory */
  MIN_QUANTITY: 0,
  /** Maximum quantity of a single item stack */
  MAX_QUANTITY: 99_999,
  /** Maximum number of different items a character can own */
  MAX_INVENTORY_SLOTS: 1000,
} as const;

/**
 * Trade System Configuration
 */
export const TRADE_CONFIG = {
  /** Default trade expiry time in minutes */
  EXPIRY_MINUTES: 30,
  /** Maximum trades a character can have pending */
  MAX_PENDING_TRADES_PER_CHARACTER: 1,
  /** Cleanup batch size for expired trades */
  CLEANUP_BATCH_SIZE: 100,
  /** Maximum number of trades to retrieve per query */
  MAX_RETRIEVE_LIMIT: 50,
} as const;

/**
 * Auction System Configuration
 */
export const AUCTION_CONFIG = {
  /** Minimum auction duration in minutes */
  MIN_DURATION_MINUTES: 1,
  /** Maximum auction duration in minutes (7 days) */
  MAX_DURATION_MINUTES: 10_080,
  /** Default auction duration in minutes if not specified */
  DEFAULT_DURATION_MINUTES: 60,
  /** Settlement batch size for processing expired auctions */
  SETTLEMENT_BATCH_SIZE: 100,
  /** Maximum active auctions to retrieve */
  MAX_ACTIVE_AUCTIONS: 100,
  /** Maximum user auctions to retrieve */
  MAX_USER_AUCTIONS: 50,
} as const;

/**
 * Notes System Configuration
 * Handles note storage and semantic search
 */
export const NOTES_CONFIG = {
  /** Default embedding dimension for vector search */
  DEFAULT_EMBEDDING_DIMENSION: 384,
  /** Embedding model name (OpenAI) */
  DEFAULT_EMBEDDING_MODEL: 'text-embedding-3-small',
  /** Default number of search results */
  DEFAULT_SEARCH_TOP_K: 5,
  /** Maximum number of search results to retrieve */
  MAX_SEARCH_TOP_K: 50,
  /** Maximum note length in characters */
  MAX_NOTE_LENGTH: 2000,
  /** Minimum note length in characters */
  MIN_NOTE_LENGTH: 1,
} as const;

/**
 * Discord Integration Configuration
 * Discord-specific limits and constraints
 */
export const DISCORD_CONFIG = {
  /** Maximum length of Discord embed description */
  MAX_EMBED_DESCRIPTION_LENGTH: 4096,
  /** Maximum length of Discord embed field value */
  MAX_EMBED_FIELD_VALUE_LENGTH: 1024,
  /** Maximum length of Discord embed field name */
  MAX_EMBED_FIELD_NAME_LENGTH: 256,
  /** Maximum number of fields in a Discord embed */
  MAX_EMBED_FIELDS: 25,
  /** Maximum length of Discord message content */
  MAX_MESSAGE_LENGTH: 2000,
  /** Maximum length of Discord slash command description */
  MAX_COMMAND_DESCRIPTION_LENGTH: 100,
  /** Maximum length of Discord slash command option description */
  MAX_OPTION_DESCRIPTION_LENGTH: 100,
} as const;

/**
 * System Performance Configuration
 * Affects caching, cleanup intervals, and resource management
 */
export const SYSTEM_CONFIG = {
  /** Cron expression for auction settlement checks: Every 10 seconds */
  AUCTION_CHECK_CRON: '*/10 * * * * *',
  /** Default cache TTL in milliseconds (5 minutes) */
  DEFAULT_CACHE_TTL_MS: 5 * 60 * 1000,
  /** Request deduplication cache size (maximum entries) */
  REQUEST_DEDUP_CACHE_SIZE: 10_000,
  /** Cleanup interval for expired cache entries in milliseconds */
  CACHE_CLEANUP_INTERVAL_MS: 60 * 1000,
  /** Default batch size for bulk database operations */
  DEFAULT_BATCH_SIZE: 100,
} as const;

/**
 * Export all game configuration as a unified object
 * Useful for passing entire config to modules
 */
export const GAME_CONFIG = {
  character: CHARACTER_CONFIG,
  economy: ECONOMY_CONFIG,
  inventory: INVENTORY_CONFIG,
  trade: TRADE_CONFIG,
  auction: AUCTION_CONFIG,
  notes: NOTES_CONFIG,
  discord: DISCORD_CONFIG,
  system: SYSTEM_CONFIG,
} as const;

/**
 * Type exports for strict typing
 */
export type CharacterConfig = typeof CHARACTER_CONFIG;
export type EconomyConfig = typeof ECONOMY_CONFIG;
export type InventoryConfig = typeof INVENTORY_CONFIG;
export type TradeConfig = typeof TRADE_CONFIG;
export type AuctionConfig = typeof AUCTION_CONFIG;
export type NotesConfig = typeof NOTES_CONFIG;
export type DiscordConfig = typeof DISCORD_CONFIG;
export type SystemConfig = typeof SYSTEM_CONFIG;
export type GameConfig = typeof GAME_CONFIG;
