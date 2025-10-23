/**
 * Throttle Decorator
 * Applies operation-level throttling to prevent rapid-fire exploitation
 *
 * Usage:
 * @Throttle('TRADE_START', 5000) // 5 second cooldown
 * async startTrade() { ... }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  createParamDecorator,
  SetMetadata,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Interaction } from 'discord.js';

/**
 * Metadata key for throttle configuration
 */
export const THROTTLE_KEY = Symbol('THROTTLE_KEY');

/**
 * Type definition for throttle decorator parameters
 */
export interface ThrottleConfig {
  operationName: string;
  intervalMs: number;
  maxRequests?: number;
  message?: string;
}

/**
 * In-memory store for tracking user operation timestamps
 * Structure: { userId: { operationName: number[] } }
 * where number[] is array of timestamps
 */
const throttleStore = new Map<string, Map<string, number[]>>();

/**
 * Cleanup old timestamps from store
 * Runs every 5 minutes to prevent memory growth
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const staleThreshold = 1 * 60 * 1000; // 1 minute of no activity

  throttleStore.forEach((userOps, userId) => {
    userOps.forEach((timestamps, operation) => {
      // Remove timestamps older than 1 hour
      const recentTimestamps = timestamps.filter((ts) => now - ts < 60 * 60 * 1000);

      if (recentTimestamps.length === 0) {
        userOps.delete(operation);
      } else {
        userOps.set(operation, recentTimestamps);
      }
    });

    // Clean up empty user entries
    if (userOps.size === 0) {
      throttleStore.delete(userId);
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Cleanup on process exit
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => clearInterval(cleanupInterval));
}

/**
 * Check if user is throttled for an operation
 */
function isThrottled(
  userId: string,
  operation: string,
  intervalMs: number,
  maxRequests: number = 1,
): { throttled: boolean; cooldownSeconds: number } {
  const now = Date.now();

  // Initialize user entry if not exists
  if (!throttleStore.has(userId)) {
    throttleStore.set(userId, new Map());
  }

  const userOps = throttleStore.get(userId)!;

  // Get timestamps for this operation
  if (!userOps.has(operation)) {
    userOps.set(operation, [now]);
    return { throttled: false, cooldownSeconds: 0 };
  }

  const timestamps = userOps.get(operation)!;

  // Remove old timestamps outside the interval
  const recentTimestamps = timestamps.filter((ts) => now - ts < intervalMs);

  // Check if at max requests
  if (recentTimestamps.length >= maxRequests) {
    const oldestRecentTimestamp = recentTimestamps[0];
    const cooldownMs = intervalMs - (now - oldestRecentTimestamp);
    const cooldownSeconds = Math.ceil(cooldownMs / 1000);

    return { throttled: true, cooldownSeconds };
  }

  // Add current timestamp
  recentTimestamps.push(now);
  userOps.set(operation, recentTimestamps);

  return { throttled: false, cooldownSeconds: 0 };
}

/**
 * Throttle Decorator
 * Prevents users from performing an operation too frequently
 *
 * @param operationName - Unique identifier for the operation (e.g., 'TRADE_START')
 * @param intervalMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in the interval (default: 1)
 * @param message - Custom error message
 */
export function Throttle(
  operationName: string,
  intervalMs: number,
  maxRequests: number = 1,
  message?: string,
) {
  return SetMetadata(THROTTLE_KEY, {
    operationName,
    intervalMs,
    maxRequests,
    message:
      message || `You are performing this action too quickly. Please wait.`,
  } as ThrottleConfig);
}

/**
 * Throttle Interceptor
 * Enforces throttle limits for decorated methods
 * Should be applied globally or to controllers
 */
@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    try {
      const args = (context.switchToRpc() as any).getArgs?.() || [];
      const request = args?.[0];

      // Skip if not a Discord interaction
      if (!request || typeof request !== 'object' || !('user' in request)) {
        return next.handle();
      }

      const interaction = request as Interaction;
      const throttleConfig = Reflect.getMetadata(THROTTLE_KEY, context.getHandler());

      // Skip if no throttle config
      if (!throttleConfig) {
        return next.handle();
      }

      const userId = interaction.user?.id;
      if (!userId) {
        return next.handle();
      }

      const { operationName, intervalMs, maxRequests, message: errorMsg } =
        throttleConfig as ThrottleConfig;

      // Check throttle status
      const { throttled, cooldownSeconds } = isThrottled(
        userId,
        operationName,
        intervalMs,
        maxRequests,
      );

      if (throttled) {
        const errorMessage = (errorMsg || 'You are performing this action too quickly.')
          .replace('{seconds}', cooldownSeconds.toString());

        return throwError(
          () =>
            new BadRequestException(
              `⏱️ ${errorMessage} (${cooldownSeconds}s cooldown)`,
            ),
        );
      }

      return next.handle().pipe(
        catchError((error) => {
          // On error, don't count this request toward throttle
          // This prevents throttle from being triggered by failures
          const now = Date.now();
          const userOps = throttleStore.get(userId);

          if (userOps && userOps.has(operationName)) {
            const timestamps = userOps.get(operationName)!;
            // Remove the last added timestamp (the current request)
            timestamps.pop();
          }

          return throwError(() => error);
        }),
      );
    } catch (err) {
      // If anything goes wrong with throttle check, allow the request through
      return next.handle();
    }
  }
}

/**
 * Get throttle status for a user and operation
 * Useful for returning remaining cooldown in command responses
 */
export function getThrottleStatus(
  userId: string,
  operation: string,
  intervalMs: number,
): number {
  const now = Date.now();
  const userOps = throttleStore.get(userId);

  if (!userOps || !userOps.has(operation)) {
    return 0;
  }

  const timestamps = userOps.get(operation)!;
  const recentTimestamps = timestamps.filter((ts) => now - ts < intervalMs);

  if (recentTimestamps.length === 0) {
    return 0;
  }

  const oldestTimestamp = recentTimestamps[0];
  const cooldownMs = intervalMs - (now - oldestTimestamp);

  return Math.max(0, Math.ceil(cooldownMs / 1000));
}

/**
 * Reset throttle for a user (admin/system use only)
 */
export function resetUserThrottle(userId: string, operation?: string): boolean {
  if (operation) {
    const userOps = throttleStore.get(userId);
    if (userOps) {
      return userOps.delete(operation);
    }
    return false;
  }

  return throttleStore.delete(userId);
}

/**
 * Get throttle statistics (debug/monitoring)
 */
export function getThrottleStats() {
  const stats = {
    totalUsers: throttleStore.size,
    totalTrackedOperations: 0,
    users: new Map<string, { operations: string[]; entryCount: number }>(),
  };

  throttleStore.forEach((userOps, userId) => {
    const operations = Array.from(userOps.keys());
    stats.totalTrackedOperations += operations.length;

    stats.users.set(userId, {
      operations,
      entryCount: operations.reduce((sum, op) => sum + (userOps.get(op)?.length || 0), 0),
    });
  });

  return stats;
}
