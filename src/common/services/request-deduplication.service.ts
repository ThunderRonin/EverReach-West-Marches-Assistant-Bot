/**
 * Request Deduplication Service
 * Prevents duplicate processing from Discord network retries
 * Uses in-memory cache with idempotency keys
 *
 * Discord can retry commands up to 3 times on failure
 * This service caches successful responses and returns them on retry
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Cached response entry
 */
interface CacheEntry<T> {
  response: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Idempotency key generation options
 */
export interface IdempotencyKeyOptions {
  userId: string;
  commandName: string;
  guildId?: string | null;
  customKey?: string;
}

/**
 * Request Deduplication Service
 * Tracks and caches command responses to prevent duplicate processing
 */
@Injectable()
export class RequestDeduplicationService {
  private logger = new Logger(RequestDeduplicationService.name);

  /**
   * In-memory cache store
   * Structure: Map<idempotencyKey, CacheEntry<T>>
   */
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Cache configuration
   */
  private readonly config = {
    // Default TTL: 5 minutes
    defaultTtlMs: 5 * 60 * 1000,
    // Max cache size: 10,000 entries
    maxCacheSize: 10000,
    // Cleanup interval: 1 minute
    cleanupIntervalMs: 60 * 1000,
  };

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Generate idempotency key from request parameters
   */
  generateIdempotencyKey(options: IdempotencyKeyOptions): string {
    const { userId, commandName, guildId, customKey } = options;

    if (customKey) {
      return customKey;
    }

    // Create deterministic key from parameters
    const keyParts = [userId, commandName, guildId || 'global'];
    const key = keyParts.join(':');

    return `idempotency:${key}`;
  }

  /**
   * Get cached response if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`✅ Cache hit for key: ${key}`);
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set<T>(key: string, response: T, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs || this.config.defaultTtlMs;

    const entry: CacheEntry<T> = {
      response,
      timestamp: now,
      expiresAt: now + ttl,
    };

    this.cache.set(key, entry);

    // Check cache size and cleanup if needed
    if (this.cache.size > this.config.maxCacheSize) {
      this.pruneCache();
    }

    this.logger.debug(`💾 Cached response for key: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cached response
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`🗑️  Cache cleared (${size} entries removed)`);
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    const averageAge = this.getAverageAge();

    this.cache.forEach((entry) => {
      if (entry.expiresAt > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      averageAgeMs: averageAge,
      maxSize: this.config.maxCacheSize,
      utilizationPercent: Math.round((this.cache.size / this.config.maxCacheSize) * 100),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Handle process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
        }
      });
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(`🧹 Cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Prune oldest entries when cache is too large
   */
  private pruneCache(): void {
    const targetSize = Math.floor(this.config.maxCacheSize * 0.8);
    const entriesToRemove = this.cache.size - targetSize;

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    // Remove oldest entries
    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.logger.warn(
      `⚠️  Cache pruned: removed ${entriesToRemove} oldest entries (size now: ${this.cache.size})`,
    );
  }

  /**
   * Calculate average age of cache entries
   */
  private getAverageAge(): number {
    if (this.cache.size === 0) {
      return 0;
    }

    const now = Date.now();
    let totalAge = 0;

    this.cache.forEach((entry) => {
      totalAge += now - entry.timestamp;
    });

    return Math.round(totalAge / this.cache.size);
  }

  /**
   * Destroy the service
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

/**
 * Deduplication options for decorator
 */
export interface DeduplicationOptions {
  ttlMs?: number;
  keyPrefix?: string;
  ignoreParams?: string[];
}

/**
 * Extract parameters from function arguments
 * Used to create reproducible idempotency keys
 */
export function extractRequestParams(args: any[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (args.length === 0) {
    return params;
  }

  const firstArg = args[0];

  if (typeof firstArg === 'object' && firstArg !== null) {
    // Extract from object properties, excluding methods and private fields
    for (const [key, value] of Object.entries(firstArg)) {
      if (!key.startsWith('_') && typeof value !== 'function') {
        params[key] = value;
      }
    }
  }

  return params;
}

/**
 * Generate hash from request parameters
 * Simple hashing for deterministic keys
 */
export function hashRequestParams(params: Record<string, unknown>): string {
  const keys = Object.keys(params).sort();
  const values = keys.map((k) => {
    const val = params[k];
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  });

  let hash = 0;
  const str = values.join('|');

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Create a wrapped function that handles deduplication
 */
export function withDeduplication<T extends (...args: any[]) => Promise<unknown>>(
  fn: T,
  service: RequestDeduplicationService,
  options: DeduplicationOptions & IdempotencyKeyOptions,
): T {
  return (async (...args: any[]) => {
    const { ttlMs, keyPrefix, ignoreParams, ...idempotencyOptions } = options;

    // Generate idempotency key
    const params = extractRequestParams(args);
    const hash = hashRequestParams(params);
    const baseKey = service.generateIdempotencyKey(idempotencyOptions);
    const finalKey = keyPrefix ? `${keyPrefix}:${baseKey}:${hash}` : `${baseKey}:${hash}`;

    // Check cache
    const cached = service.get(finalKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    service.set(finalKey, result, ttlMs);

    return result;
  }) as T;
}
