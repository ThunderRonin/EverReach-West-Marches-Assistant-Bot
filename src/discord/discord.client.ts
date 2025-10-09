import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';

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

      // Send startup notification (non-blocking)
      void this.sendStartupNotification();
    });

    this.on('error', (error) => {
      this.logger.error('Discord client error:', error);
    });
  }

  private async sendStartupNotification() {
    try {
      const channelId = process.env.STARTUP_CHANNEL_ID;

      // If no channel configured, just log
      if (!channelId) {
        this.logger.log(
          '✅ Bot is ready! (Set STARTUP_CHANNEL_ID to send startup message)',
        );
        return;
      }

      const channel = await this.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        this.logger.warn(
          `Startup channel ${channelId} not found or not a text channel`,
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🤖 Bot Started Successfully')
        .setColor('#00ff00')
        .setDescription('EverReach Assistant is now online and ready!')
        .addFields(
          { name: 'Status', value: '✅ Connected', inline: true },
          { name: 'Version', value: '1.0.0', inline: true },
          {
            name: 'Environment',
            value: process.env.NODE_ENV || 'development',
            inline: true,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use / to see available commands' });

      await (channel as TextChannel).send({ embeds: [embed] });

      this.logger.log(`✅ Startup notification sent to channel ${channelId}`);
    } catch (error) {
      this.logger.error('Failed to send startup notification:', error);
      // Don't throw - this is non-critical
    }
  }
}
