import { Injectable, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordClient extends Client {
  private readonly logger = new Logger(DiscordClient.name);

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.once('ready', () => {
      this.logger.log(`Discord bot logged in as ${this.user?.tag}!`);
    });

    this.on('error', (error) => {
      this.logger.error('Discord client error:', error);
    });
  }
}
