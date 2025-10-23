import { Injectable, Logger } from '@nestjs/common';
import { Context, Once } from 'necord';
import type { ContextOf } from 'necord';
import { Client } from 'discord.js';

/**
 * Service to provide access to the Discord client throughout the application
 * Stores the client reference when the bot is ready
 */
@Injectable()
export class ClientProvider {
  private readonly logger = new Logger(ClientProvider.name);
  private client: Client | null = null;

  @Once('clientReady')
  onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.client = client;
    this.logger.log('Discord client is now available via ClientProvider');
  }

  /**
   * Get the Discord client instance
   * Returns null if client is not yet ready
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Check if the client is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }
}
