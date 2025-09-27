import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { EconomyService } from '../../economy/economy.service';

@Injectable()
export class ShopCommand {
  private readonly logger = new Logger(ShopCommand.name);

  constructor(private readonly economyService: EconomyService) {}

  data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop catalog');

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const items = await this.economyService.getAllItems();

      const embed = new EmbedBuilder()
        .setTitle('🏪 General Store')
        .setColor('#0099ff')
        .setDescription(
          'Welcome to the General Store! Use `/buy <item> <quantity>` to make a purchase.',
        );

      if (items.length === 0) {
        embed.setDescription('The shop is currently empty. Check back later!');
      } else {
        const itemList = items
          .map(
            (item) => `**${item.name}** (${item.key}) - ${item.baseValue} gold`,
          )
          .join('\n');

        embed.addFields({ name: 'Available Items', value: itemList });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in shop command:', error);
      return interaction.reply({
        content:
          'An error occurred while retrieving the shop catalog. Please try again.',
        ephemeral: true,
      });
    }
  }
}
