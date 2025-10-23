/**
 * Input Sanitization Configuration
 * Defines rules and patterns for sanitizing user input across the application
 */

/**
 * Sanitization strategies for different input types
 */
export const SANITIZATION_RULES = {
  /**
   * Item keys: alphanumeric + underscores
   * Examples: sword, iron_sword, diamond_pickaxe
   */
  ITEM_KEY: {
    pattern: /^[a-zA-Z0-9_]+$/,
    description: 'Item key must contain only alphanumeric characters and underscores',
    maxLength: 50,
  },

  /**
   * Character names: alphanumeric + spaces + hyphens
   * Examples: Sir Lancelot, Dragon-Slayer, Mage 42
   */
  CHARACTER_NAME: {
    pattern: /^[a-zA-Z0-9\s\-']+$/,
    description: 'Character name must contain only alphanumeric characters, spaces, hyphens, and apostrophes',
    maxLength: 100,
  },

  /**
   * Notes/text content: allow most characters but prevent XSS
   * Will be XSS-cleaned separately
   */
  NOTE_CONTENT: {
    pattern: /^[\s\S]{0,5000}$/, // Allow any character including newlines
    description: 'Note content must be less than 5000 characters',
    maxLength: 5000,
  },

  /**
   * Discord usernames/handles
   * Pattern follows Discord username guidelines
   */
  DISCORD_USERNAME: {
    pattern: /^[a-zA-Z0-9_-]+#[0-9]{4}$/,
    description: 'Invalid Discord username format (username#discriminator)',
    maxLength: 37, // Max Discord username + # + 4 digits
  },

  /**
   * Guild/server names
   * Allow most characters but with length limits
   */
  GUILD_NAME: {
    pattern: /^[\w\s\-'&.]+$/,
    description: 'Guild name contains invalid characters',
    maxLength: 100,
  },
} as const;

/**
 * XSS Prevention Options
 * Used by the xss library to sanitize HTML/script content
 */
export const XSS_OPTIONS = {
  whiteList: {}, // Empty whitelist - no HTML tags allowed
  stripIgnoredTag: true,
  stripLeadingAndTrailingWhitespace: true,
  onTagAttr: (tag: string, name: string, value: string) => {
    // Strip all attributes
    return '';
  },
} as const;

/**
 * Sanitization error messages
 */
export const SANITIZATION_ERROR_MESSAGES = {
  INVALID_ITEM_KEY: 'Invalid item key format. Use only alphanumeric characters and underscores.',
  INVALID_CHARACTER_NAME: 'Invalid character name. Use only alphanumeric characters, spaces, hyphens, and apostrophes.',
  INVALID_NOTE_CONTENT: 'Invalid note content. Maximum 5000 characters allowed.',
  INVALID_DISCORD_USERNAME: 'Invalid Discord username format.',
  INVALID_GUILD_NAME: 'Invalid guild name format.',
  CONTENT_TOO_LONG: 'Content exceeds maximum length of {maxLength} characters.',
  CONTENT_EMPTY: 'Content cannot be empty.',
} as const;

/**
 * Fields that require sanitization in each entity
 */
export const SANITIZABLE_FIELDS = {
  Item: ['key', 'name'],
  Character: ['name'],
  Note: ['text'],
  Auction: ['itemKey'],
  Trade: ['notes'], // If added later
} as const;

/**
 * Sanitization bypass list
 * Some numeric IDs and system fields should never be sanitized
 */
export const SANITIZATION_BYPASS = [
  'id',
  'charId',
  'itemId',
  'userId',
  'sellerId',
  'bidderId',
  'gold',
  'qty',
  'minBid',
  'currentBid',
  'baseValue',
  'createdAt',
  'updatedAt',
  'expiresAt',
  'status',
] as const;

/**
 * Input length limits (in characters)
 */
export const INPUT_LENGTH_LIMITS = {
  MIN_ITEM_KEY: 1,
  MAX_ITEM_KEY: 50,
  MIN_CHARACTER_NAME: 1,
  MAX_CHARACTER_NAME: 100,
  MIN_NOTE_CONTENT: 0, // Can be empty
  MAX_NOTE_CONTENT: 5000,
  MIN_GUILD_NAME: 1,
  MAX_GUILD_NAME: 100,
} as const;

/**
 * Rate limit bypass list
 * Some system operations don't count toward rate limits
 */
export const RATE_LIMIT_EXEMPT_OPERATIONS = [
  'GET_PROFILE',
  'GET_INVENTORY',
  'GET_AUCTIONS',
  'GET_TRADES',
  'GET_NOTES',
] as const;
