import { Injectable, Logger } from '@nestjs/common';
import { Context, Once } from 'necord';
import type { ContextOf } from 'necord';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';

@Injectable()
export class ReadyListener {
  private readonly logger = new Logger(ReadyListener.name);

  @Once('clientReady')
  onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.logger.log(`✅ Discord bot logged in as ${client.user.tag}!`);

    // Send startup notification
    void this.sendStartupNotification(client);
  }

  private async sendStartupNotification(client: Client) {
    try {
      const channelId = process.env.STARTUP_CHANNEL_ID;

      if (!channelId) {
        this.logger.log(
          '✅ Bot is ready! (Set STARTUP_CHANNEL_ID to send startup message)',
        );
        return;
      }

      const channel = await client.channels.fetch(channelId);

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
    }
  }
}
