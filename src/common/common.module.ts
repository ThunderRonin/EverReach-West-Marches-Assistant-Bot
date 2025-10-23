/**
 * Common Module
 * Exports shared guards, interceptors, and services used across the application
 */

import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { CommandLoggingInterceptor } from './interceptors/command-logging.interceptor';
import { ThrottleInterceptor } from './decorators/throttle.decorator';
import { RequestDeduplicationService } from './services/request-deduplication.service';

/**
 * Provider for guards that apply globally
 */
const globalGuards = [
  {
    provide: APP_GUARD,
    useClass: RateLimitGuard,
  },
];

/**
 * Provider for interceptors that apply globally
 */
const globalInterceptors = [
  {
    provide: APP_INTERCEPTOR,
    useClass: CommandLoggingInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ThrottleInterceptor,
  },
];

/**
 * Services to export
 */
const services = [RequestDeduplicationService];

@Module({
  providers: [...globalGuards, ...globalInterceptors, ...services],
  exports: [RequestDeduplicationService],
})
export class CommonModule {}
