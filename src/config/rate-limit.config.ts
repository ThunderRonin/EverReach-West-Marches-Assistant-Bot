/**
 * Rate Limiting Configuration
 * Defines rate limits for Discord commands and operations
 */

/**
 * Rate limit tiers and their configurations
 */
export const RATE_LIMIT_CONFIG = {
  /**
   * Strict limits: Commands that modify game state significantly
   * Examples: startTrade, acceptTrade, placeBid, createAuction
   */
  STRICT: {
    windowMs: 5000, // 5 seconds
    maxRequests: 1, // 1 request per 5 seconds
    message: 'You are executing actions too quickly. Please wait a few seconds before trying again.',
  },

  /**
   * Standard limits: Regular commands with moderate impact
   * Examples: addToTradeOffer, cancel, view listings
   */
  STANDARD: {
    windowMs: 2000, // 2 seconds
    maxRequests: 2, // 2 requests per 2 seconds
    message: 'Too many requests. Please slow down.',
  },

  /**
   * Relaxed limits: Read-only or low-impact commands
   * Examples: viewProfile, listItems, getAuctions
   */
  RELAXED: {
    windowMs: 1000, // 1 second
    maxRequests: 5, // 5 requests per 1 second
    message: 'You are sending requests too quickly.',
  },

  /**
   * Per-guild limits: Overall command rate for entire guild
   */
  GUILD_WIDE: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 commands per minute per guild
    message: 'This guild has exceeded command rate limits. Please try again shortly.',
  },
} as const;

/**
 * Per-operation throttling (separate from rate limiting)
 * Tracks individual operation types
 */
export const OPERATION_THROTTLE_LIMITS = {
  TRADE_START: {
    windowMs: 5000, // 5 seconds between trade starts
    maxAttempts: 1,
  },
  TRADE_ADD_OFFER: {
    windowMs: 1000, // 1 second between adding offers
    maxAttempts: 3,
  },
  TRADE_ACCEPT: {
    windowMs: 3000, // 3 seconds between accepts
    maxAttempts: 1,
  },
  AUCTION_CREATE: {
    windowMs: 10000, // 10 seconds between auction creates
    maxAttempts: 1,
  },
  AUCTION_BID: {
    windowMs: 2000, // 2 seconds between bids
    maxAttempts: 1,
  },
  ITEM_BUY: {
    windowMs: 2000, // 2 seconds between purchases
    maxAttempts: 2,
  },
} as const;

/**
 * Command classification for rate limiting
 * Maps Discord slash commands to their rate limit tier
 */
export const COMMAND_RATE_LIMITS: Record<string, keyof typeof RATE_LIMIT_CONFIG> = {
  // Trade commands
  'trade start': 'STRICT',
  'trade add': 'STANDARD',
  'trade show': 'RELAXED',
  'trade accept': 'STRICT',
  'trade cancel': 'STANDARD',

  // Auction commands
  'auction create': 'STRICT',
  'auction bid': 'STRICT',
  'auction list': 'RELAXED',
  'auction show': 'RELAXED',

  // Economy commands
  'buy': 'STANDARD',
  'shop': 'RELAXED',
  'balance': 'RELAXED',

  // User commands
  'profile': 'RELAXED',
  'inventory': 'RELAXED',
  'register': 'STANDARD',

  // Note commands
  'note add': 'STANDARD',
  'note search': 'RELAXED',
  'note list': 'RELAXED',
};

/**
 * Rate limit error messages
 */
export const RATE_LIMIT_ERROR_MESSAGES = {
  COMMAND_RATE_LIMIT_EXCEEDED: 'You are using commands too frequently. Please wait before trying again.',
  GUILD_RATE_LIMIT_EXCEEDED: 'This server has exceeded its command rate limit. Please try again in a moment.',
  OPERATION_THROTTLED: 'This action is on cooldown. Please wait {cooldownSeconds} seconds.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to use this command.',
} as const;

/**
 * Bypass configurations
 */
export const RATE_LIMIT_BYPASS = {
  /**
   * User IDs that bypass rate limits
   * Examples: Bot developers, admins
   */
  bypassUserIds: process.env.RATE_LIMIT_BYPASS_USERS?.split(',') || [],

  /**
   * Guild IDs that bypass rate limits
   * Examples: Testing guilds
   */
  bypassGuildIds: process.env.RATE_LIMIT_BYPASS_GUILDS?.split(',') || [],

  /**
   * Readonly operations that don't count toward limits
   */
  readOnlyOperations: [
    'view',
    'list',
    'search',
    'get',
    'show',
    'profile',
    'inventory',
  ],
} as const;

/**
 * Storage configuration for rate limit tracking
 */
export const RATE_LIMIT_STORAGE = {
  /**
   * Use in-memory storage (default, simpler but not distributed)
   * Perfect for single-instance deployments
   */
  type: 'memory' as const,

  /**
   * Cleanup interval: remove expired entries (in milliseconds)
   */
  cleanupIntervalMs: 60000, // Every minute

  /**
   * Maximum number of tracked IPs/users before cleanup
   */
  maxTrackedIdentities: 10000,
} as const;
