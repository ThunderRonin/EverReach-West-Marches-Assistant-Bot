/**
 * Validation Constants Configuration
 * Input validation limits, constraints, and regex patterns
 * These are separate from Zod schemas to provide centralized validation rules
 */

/**
 * String Validation Constraints
 * Controls length and encoding limits for text inputs
 */
export const STRING_VALIDATION = {
  /** Maximum length for character names */
  CHARACTER_NAME_MAX_LENGTH: 100,
  /** Maximum length for item names */
  ITEM_NAME_MAX_LENGTH: 100,
  /** Maximum length for item keys (identifiers) */
  ITEM_KEY_MAX_LENGTH: 50,
  /** Maximum length for item descriptions */
  ITEM_DESCRIPTION_MAX_LENGTH: 500,
  /** Maximum length for note content */
  NOTE_CONTENT_MAX_LENGTH: 2000,
  /** Maximum length for error messages */
  ERROR_MESSAGE_MAX_LENGTH: 500,
  /** Maximum length for audit log entries */
  LOG_ENTRY_MAX_LENGTH: 1000,
} as const;

/**
 * Numeric Input Validation
 * Constraints on numeric parameters
 */
export const NUMERIC_VALIDATION = {
  /** Minimum value for any unsigned integer (IDs, counts, etc.) */
  MIN_POSITIVE_INTEGER: 1,
  /** Maximum safe JavaScript integer for database IDs */
  MAX_SAFE_INTEGER: 2_147_483_647,
  /** Maximum gold amount (prevents overflow) */
  MAX_GOLD: 999_999_999,
  /** Maximum item quantity in inventory */
  MAX_ITEM_QUANTITY: 99_999,
  /** Maximum items per trade offer */
  MAX_ITEMS_PER_OFFER: 1000,
  /** Maximum auction quantity */
  MAX_AUCTION_QUANTITY: 999_999,
  /** Maximum bid amount */
  MAX_BID_AMOUNT: 999_999_999,
  /** Minimum auction duration in minutes */
  MIN_AUCTION_DURATION: 1,
  /** Maximum auction duration in minutes */
  MAX_AUCTION_DURATION: 10_080,
  /** Minimum bid increment percentage */
  MIN_BID_INCREMENT_PERCENT: 0.01,
  /** Maximum bid increment percentage */
  MAX_BID_INCREMENT_PERCENT: 1.0,
} as const;

/**
 * Regular Expression Patterns for Validation
 * Used for format validation of strings
 */
export const REGEX_PATTERNS = {
  /** Discord user ID pattern (18-21 digits) */
  DISCORD_ID: /^[\d]{18,21}$/,
  /** Discord username pattern (3-32 alphanumeric chars, may include underscore/hyphen) */
  DISCORD_USERNAME: /^[a-zA-Z0-9_-]{3,32}$/,
  /** Item key pattern: lowercase alphanumeric with underscores (e.g., 'iron_sword') */
  ITEM_KEY: /^[a-z0-9_]+$/,
  /** Character name: alphanumeric, spaces, hyphens (typical RPG names) */
  CHARACTER_NAME: /^[a-zA-Z0-9\s\-']{1,100}$/,
  /** Email validation (basic) */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** URL validation */
  URL: /^https?:\/\/.+/,
  /** Hexadecimal color code */
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
} as const;

/**
 * Rate Limiting Constraints
 * Applied at command and operation levels
 */
export const RATE_LIMIT_VALIDATION = {
  /** Maximum commands per user per second */
  MAX_COMMANDS_PER_SECOND: 2,
  /** Maximum commands per user per minute */
  MAX_COMMANDS_PER_MINUTE: 30,
  /** Maximum trades per user per hour */
  MAX_TRADES_PER_HOUR: 10,
  /** Maximum auctions per user per hour */
  MAX_AUCTIONS_PER_HOUR: 5,
  /** Maximum notes per user per minute */
  MAX_NOTES_PER_MINUTE: 5,
  /** Cooldown between rapid operations in milliseconds */
  OPERATION_COOLDOWN_MS: 500,
} as const;

/**
 * Field Length Validation
 * Specific constraints for database field values
 */
export const FIELD_LENGTH_VALIDATION = {
  /** Prisma Text field: max 1MB, but practical limit */
  TEXT_FIELD_MAX: 10_000,
  /** JSON payload field: prevent excessively large transactions */
  JSON_PAYLOAD_MAX_SIZE: 50_000,
  /** Discord embed field: max 1024 characters */
  DISCORD_FIELD_MAX: 1024,
  /** Discord message max length */
  DISCORD_MESSAGE_MAX: 2000,
} as const;

/**
 * Transaction and Operation Limits
 * Controls atomicity and batch processing
 */
export const TRANSACTION_VALIDATION = {
  /** Maximum items in a single transaction */
  MAX_ITEMS_PER_TRANSACTION: 100,
  /** Maximum characters involved in a single operation */
  MAX_CHARACTERS_PER_OPERATION: 2,
  /** Timeout for database transactions in milliseconds */
  TRANSACTION_TIMEOUT_MS: 30_000,
  /** Maximum retries for failed transactions */
  MAX_TRANSACTION_RETRIES: 3,
} as const;

/**
 * ID Validation Constraints
 * Validation rules for various ID types
 */
export const ID_VALIDATION = {
  /** Minimum character ID value */
  MIN_CHARACTER_ID: 1,
  /** Maximum character ID value */
  MAX_CHARACTER_ID: NUMERIC_VALIDATION.MAX_SAFE_INTEGER,
  /** Minimum item ID value */
  MIN_ITEM_ID: 1,
  /** Maximum item ID value */
  MAX_ITEM_ID: NUMERIC_VALIDATION.MAX_SAFE_INTEGER,
  /** Minimum user ID value */
  MIN_USER_ID: 1,
  /** Maximum user ID value */
  MAX_USER_ID: NUMERIC_VALIDATION.MAX_SAFE_INTEGER,
  /** Minimum trade ID value */
  MIN_TRADE_ID: 1,
  /** Maximum trade ID value */
  MAX_TRADE_ID: NUMERIC_VALIDATION.MAX_SAFE_INTEGER,
  /** Minimum auction ID value */
  MIN_AUCTION_ID: 1,
  /** Maximum auction ID value */
  MAX_AUCTION_ID: NUMERIC_VALIDATION.MAX_SAFE_INTEGER,
} as const;

/**
 * Discord Validation Limits
 * Specific constraints for Discord API integration
 */
export const DISCORD_VALIDATION = {
  /** Discord user ID length */
  USER_ID_LENGTH: 18,
  /** Discord guild ID length */
  GUILD_ID_LENGTH: 18,
  /** Maximum embed description length */
  EMBED_DESCRIPTION_MAX: 4096,
  /** Maximum embed field value length */
  EMBED_FIELD_VALUE_MAX: 1024,
  /** Maximum embed fields count */
  EMBED_FIELDS_MAX: 25,
  /** Maximum embed title length */
  EMBED_TITLE_MAX: 256,
  /** Maximum message content length */
  MESSAGE_MAX: 2000,
  /** Maximum slash command option description length */
  COMMAND_OPTION_DESCRIPTION_MAX: 100,
  /** Maximum slash command description length */
  COMMAND_DESCRIPTION_MAX: 100,
} as const;

/**
 * Sanitization Input Validation
 * Constraints for XSS prevention and input sanitization
 */
export const SANITIZATION_VALIDATION = {
  /** Maximum input string length for sanitization */
  MAX_SANITIZE_LENGTH: 10_000,
  /** HTML tags to allow in sanitized output (empty = strip all) */
  ALLOWED_HTML_TAGS: [],
  /** HTML attributes to allow in sanitized output */
  ALLOWED_HTML_ATTRIBUTES: [],
  /** Maximum nesting depth for XSS prevention */
  MAX_NESTING_DEPTH: 10,
  /** Regex for potential XSS patterns */
  XSS_PATTERNS: [/<script/i, /javascript:/i, /on\w+=/i],
} as const;

/**
 * Pagination Validation
 * Constraints for data retrieval operations
 */
export const PAGINATION_VALIDATION = {
  /** Default page size for list operations */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size to prevent DoS */
  MAX_PAGE_SIZE: 100,
  /** Minimum page size */
  MIN_PAGE_SIZE: 1,
  /** Default page number */
  DEFAULT_PAGE: 1,
  /** Maximum result offset to prevent iteration attacks */
  MAX_OFFSET: 1_000_000,
} as const;

/**
 * Export all validation constants as a unified object
 */
export const VALIDATION_CONFIG = {
  strings: STRING_VALIDATION,
  numeric: NUMERIC_VALIDATION,
  regexPatterns: REGEX_PATTERNS,
  rateLimit: RATE_LIMIT_VALIDATION,
  fieldLength: FIELD_LENGTH_VALIDATION,
  transaction: TRANSACTION_VALIDATION,
  ids: ID_VALIDATION,
  discord: DISCORD_VALIDATION,
  sanitization: SANITIZATION_VALIDATION,
  pagination: PAGINATION_VALIDATION,
} as const;

/**
 * Type exports for strict typing
 */
export type StringValidation = typeof STRING_VALIDATION;
export type NumericValidation = typeof NUMERIC_VALIDATION;
export type RegexPatterns = typeof REGEX_PATTERNS;
export type RateLimitValidation = typeof RATE_LIMIT_VALIDATION;
export type FieldLengthValidation = typeof FIELD_LENGTH_VALIDATION;
export type TransactionValidation = typeof TRANSACTION_VALIDATION;
export type IdValidation = typeof ID_VALIDATION;
export type DiscordValidation = typeof DISCORD_VALIDATION;
export type SanitizationValidation = typeof SANITIZATION_VALIDATION;
export type PaginationValidation = typeof PAGINATION_VALIDATION;
export type ValidationConfig = typeof VALIDATION_CONFIG;
