import { Injectable, Logger } from '@nestjs/common';
import { Context, On } from 'necord';
import type { ContextOf } from 'necord';

@Injectable()
export class ErrorListener {
  private readonly logger = new Logger(ErrorListener.name);

  @On('error')
  onError(@Context() [error]: ContextOf<'error'>) {
    this.logger.error('Discord client error:', error);
  }

  @On('warn')
  onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn('Discord client warning:', message);
  }
}
