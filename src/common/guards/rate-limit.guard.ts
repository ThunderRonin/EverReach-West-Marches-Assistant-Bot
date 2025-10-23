/**
 * Rate Limit Guard
 * Enforces command-level rate limiting using @nestjs/throttler
 * Integrates with rate limit configuration to apply tier-based limits
 *
 * Usage:
 * @UseGuards(RateLimitGuard)
 * @SlashCommand({ name: 'trade', subcommand: 'start' })
 * async tradeStart() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Interaction, BaseInteraction } from 'discord.js';
import {
  COMMAND_RATE_LIMITS,
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_BYPASS,
} from '../../config/rate-limit.config';

/**
 * In-memory rate limit store
 * Structure: { "userId:commandName": { count: number, resetTime: number } }
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Cleanup old entries periodically
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();

  rateLimitStore.forEach((value, key) => {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}, 2 * 60 * 1000); // Every 2 minutes

/**
 * Cleanup on process exit
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => clearInterval(cleanupInterval));
}

/**
 * Build command name from Discord interaction
 */
function getCommandName(interaction: BaseInteraction): string {
  if (!('commandName' in interaction)) {
    return 'unknown';
  }

  const commandName = (interaction as any).commandName || '';
  const subcommandGroup = 'subcommandGroup' in interaction ? (interaction as any).subcommandGroup : null;
  const subcommand = 'options' in interaction ? (interaction as any).options?.getSubcommand?.(false) : null;

  if (subcommandGroup && subcommand) {
    return `${commandName} ${subcommandGroup} ${subcommand}`;
  }

  if (subcommand) {
    return `${commandName} ${subcommand}`;
  }

  return commandName;
}

/**
 * Get rate limit tier for a command
 */
function getRateLimitTier(commandName: string): string | null {
  // Direct match first
  if (commandName in COMMAND_RATE_LIMITS) {
    return COMMAND_RATE_LIMITS[commandName as keyof typeof COMMAND_RATE_LIMITS];
  }

  // Try partial matching for subcommands
  for (const [key, tier] of Object.entries(COMMAND_RATE_LIMITS)) {
    if (commandName.startsWith(key)) {
      return tier;
    }
  }

  return null;
}

/**
 * Check if user is in bypass list
 */
function isUserBypassedForCommand(userId: string, commandName: string): boolean {
  // Check if user is in global bypass list
  if (RATE_LIMIT_BYPASS.bypassUserIds?.includes(userId)) {
    return true;
  }

  // Check if command is read-only exempt
  const isReadOnlyCommand =
    commandName.includes('list') ||
    commandName.includes('show') ||
    commandName.includes('search') ||
    commandName.includes('balance') ||
    commandName.includes('inventory') ||
    commandName.includes('profile');

  if (isReadOnlyCommand) {
    return RATE_LIMIT_BYPASS.readOnlyOperations.some((op) => commandName.includes(op));
  }

  return false;
}

/**
 * Get key for rate limit tracking
 */
function getRateLimitKey(userId: string, commandName: string, tier: string): string {
  // Guild-wide commands are tracked per guild
  if (tier === 'GUILD_WIDE') {
    return `guild:${userId}:${commandName}`;
  }

  // User-specific commands are tracked per user
  return `user:${userId}:${commandName}`;
}

/**
 * Check rate limit status
 */
function checkRateLimit(
  userId: string,
  commandName: string,
  tier: string,
): { limited: boolean; resetTime: number; remaining: number } {
  const config = RATE_LIMIT_CONFIG[tier as keyof typeof RATE_LIMIT_CONFIG];

  if (!config) {
    return { limited: false, resetTime: 0, remaining: -1 };
  }

  const key = getRateLimitKey(userId, commandName, tier);
  const now = Date.now();

  // Get or create limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return { limited: false, resetTime: entry.resetTime, remaining: config.maxRequests - 1 };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      limited: true,
      resetTime: entry.resetTime,
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;
  return {
    limited: false,
    resetTime: entry.resetTime,
    remaining: config.maxRequests - entry.count,
  };
}

/**
 * Rate Limit Guard
 * Enforces command-level rate limiting
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    try {
      const args = (context.switchToRpc() as any).getArgs?.() || [];
      const interaction = args[0];

      // Skip if not a valid Discord interaction
      if (!interaction || !('user' in interaction)) {
        return true;
      }

      const userId = (interaction as BaseInteraction).user?.id;
      if (!userId) {
        return true;
      }

      const commandName = getCommandName(interaction as BaseInteraction);

      // Check if user is bypassed
      if (isUserBypassedForCommand(userId, commandName)) {
        return true;
      }

      // Get rate limit tier
      const tier = getRateLimitTier(commandName);
      if (!tier) {
        // Command not in rate limit list, allow through
        return true;
      }

      // Check rate limit
      const { limited, resetTime, remaining } = checkRateLimit(userId, commandName, tier);

      if (limited) {
        const now = Date.now();
        const resetInSeconds = Math.ceil((resetTime - now) / 1000);

        throw new ForbiddenException(
          `⏱️ Rate limit exceeded for **/${commandName}**. Reset in ${resetInSeconds}s.`,
        );
      }

      // Optionally warn if close to limit
      if (remaining <= 1 && remaining >= 0) {
        console.warn(
          `⚠️ User ${userId} approaching rate limit for /${commandName} (${remaining} requests remaining)`,
        );
      }

      return true;
    } catch (error) {
      // On error, allow the request through to avoid breaking bot functionality
      if (error instanceof ForbiddenException) {
        throw error; // Re-throw rate limit errors
      }

      console.error('Rate limit guard error:', error);
      return true;
    }
  }
}

/**
 * Get current rate limit status for a user command
 * Useful for admin/debug commands
 */
export function getRateLimitStatus(
  userId: string,
  commandName: string,
  tier: string,
): { count: number; maxRequests: number; resetInSeconds: number } {
  const config = RATE_LIMIT_CONFIG[tier as keyof typeof RATE_LIMIT_CONFIG];

  if (!config) {
    return { count: 0, maxRequests: 0, resetInSeconds: 0 };
  }

  const key = getRateLimitKey(userId, commandName, tier);
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { count: 0, maxRequests: config.maxRequests, resetInSeconds: 0 };
  }

  const now = Date.now();
  const resetInSeconds = Math.max(0, Math.ceil((entry.resetTime - now) / 1000));

  return {
    count: entry.count,
    maxRequests: config.maxRequests,
    resetInSeconds,
  };
}

/**
 * Reset rate limit for user (admin use)
 */
export function resetRateLimit(userId: string, commandName?: string): boolean {
  if (commandName) {
    // Try to find and delete specific command limit
    let found = false;

    for (const tier of Object.keys(RATE_LIMIT_CONFIG)) {
      const key = getRateLimitKey(userId, commandName, tier);
      if (rateLimitStore.has(key)) {
        rateLimitStore.delete(key);
        found = true;
      }
    }

    return found;
  }

  // Reset all commands for user
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((_, key) => {
    if (key.includes(userId)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => rateLimitStore.delete(key));

  return keysToDelete.length > 0;
}

/**
 * Get global rate limit statistics
 */
export function getRateLimitStats() {
  const stats = {
    totalTracked: rateLimitStore.size,
    byTier: {
      STRICT: 0,
      STANDARD: 0,
      RELAXED: 0,
      GUILD_WIDE: 0,
    } as Record<string, number>,
    entries: [] as Array<{
      key: string;
      count: number;
      maxRequests: number;
      resetInSeconds: number;
    }>,
  };

  const now = Date.now();

  rateLimitStore.forEach((entry, key) => {
    // Determine tier from key (this is a heuristic)
    let tier = 'UNKNOWN';
    if (key.startsWith('guild:')) {
      tier = 'GUILD_WIDE';
    } else {
      // Would need more context to determine, default to STANDARD
      tier = 'STANDARD';
    }

    stats.entries.push({
      key,
      count: entry.count,
      maxRequests: RATE_LIMIT_CONFIG.STANDARD.maxRequests, // Default to STANDARD
      resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
    });
  });

  return stats;
}
