/**
 * Operation Throttling Configuration
 * Defines throttle limits for critical operations to prevent abuse
 */

/**
 * Throttle configuration for each operation
 * Tracks per-user throttling to prevent rapid-fire exploitation
 */
export const THROTTLE_CONFIG = {
  /**
   * Trade operations throttling
   */
  TRADE: {
    START: {
      intervalMs: 5000, // Minimum 5 seconds between trade starts
      maxPerInterval: 1,
      cooldownMessage: 'You must wait {seconds}s before starting another trade.',
    },
    ADD_OFFER: {
      intervalMs: 1000, // Can add offers every 1 second
      maxPerInterval: 3, // But max 3 per second
      cooldownMessage: 'You are adding offers too quickly. Please wait a moment.',
    },
    ACCEPT: {
      intervalMs: 3000, // Minimum 3 seconds between accepts
      maxPerInterval: 1,
      cooldownMessage: 'You are accepting trades too quickly. Please wait {seconds}s.',
    },
    CANCEL: {
      intervalMs: 2000, // Minimum 2 seconds between cancels
      maxPerInterval: 2,
      cooldownMessage: 'Please wait before canceling another trade.',
    },
  },

  /**
   * Auction operations throttling
   */
  AUCTION: {
    CREATE: {
      intervalMs: 10000, // Minimum 10 seconds between auction creates
      maxPerInterval: 1,
      cooldownMessage: 'You can only create one auction every 10 seconds.',
    },
    BID: {
      intervalMs: 2000, // Minimum 2 seconds between bids
      maxPerInterval: 1,
      cooldownMessage: 'You are bidding too quickly. Please wait {seconds}s.',
    },
    CANCEL: {
      intervalMs: 5000, // Minimum 5 seconds between auction cancels
      maxPerInterval: 1,
      cooldownMessage: 'You can only cancel one auction every 5 seconds.',
    },
  },

  /**
   * Economy operations throttling
   */
  ECONOMY: {
    BUY: {
      intervalMs: 2000, // Minimum 2 seconds between purchases
      maxPerInterval: 2, // Can buy up to 2 items per 2 seconds
      cooldownMessage: 'You are purchasing too quickly. Please wait a moment.',
    },
  },

  /**
   * Note operations throttling
   */
  NOTE: {
    CREATE: {
      intervalMs: 1000, // Minimum 1 second between note creates
      maxPerInterval: 3, // Can create up to 3 notes per second
      cooldownMessage: 'You are creating notes too quickly.',
    },
    SEARCH: {
      intervalMs: 500, // Allow fast searches
      maxPerInterval: 10,
      cooldownMessage: 'Too many searches. Please wait.',
    },
  },
} as const;

/**
 * Global throttle limits (applies to all users)
 */
export const GLOBAL_THROTTLE_LIMITS = {
  /**
   * Overall operations per user per minute
   */
  MAX_OPS_PER_MINUTE: 60,

  /**
   * Overall operations per user per hour
   */
  MAX_OPS_PER_HOUR: 1000,

  /**
   * Overall operations per guild per minute
   */
  GUILD_MAX_OPS_PER_MINUTE: 500,
} as const;

/**
 * Throttle bypass rules
 */
export const THROTTLE_BYPASS = {
  /**
   * User IDs exempt from throttling
   */
  bypassUserIds: process.env.THROTTLE_BYPASS_USERS?.split(',') || [],

  /**
   * Operations that don't count toward throttling
   */
  bypassOperations: ['VIEW', 'LIST', 'SEARCH', 'GET'],
} as const;

/**
 * Cooldown calculation helper
 */
export function calculateCooldown(
  lastActionTime: number,
  throttleIntervalMs: number,
): number {
  const now = Date.now();
  const elapsed = now - lastActionTime;
  const remaining = throttleIntervalMs - elapsed;

  return Math.max(0, Math.ceil(remaining / 1000)); // Return in seconds, rounded up
}

/**
 * Check if user should be throttled
 */
export function shouldThrottle(
  lastActionTime: number | undefined,
  throttleIntervalMs: number,
): { throttled: boolean; cooldownSeconds: number } {
  if (!lastActionTime) {
    return { throttled: false, cooldownSeconds: 0 };
  }

  const now = Date.now();
  const elapsed = now - lastActionTime;

  if (elapsed < throttleIntervalMs) {
    const cooldownMs = throttleIntervalMs - elapsed;
    const cooldownSeconds = Math.ceil(cooldownMs / 1000);
    return { throttled: true, cooldownSeconds };
  }

  return { throttled: false, cooldownSeconds: 0 };
}
