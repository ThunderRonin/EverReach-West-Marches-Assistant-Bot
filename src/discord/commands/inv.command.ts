import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';

@Injectable()
export class InvCommand {
  private readonly logger = new Logger(InvCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('inv')
    .setDescription('View your inventory');

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
      }

      const user = await this.usersService.getUserByDiscordId(
        discordId,
        guildId,
      );

      if (!user?.character) {
        return interaction.reply({
          content:
            'You need to register a character first! Use `/register <name>` to get started.',
          ephemeral: true,
        });
      }

      const inventory = await this.economyService.getCharacterInventory(
        user.character.id,
      );

      const embed = new EmbedBuilder()
        .setTitle(`${user.character.name}'s Inventory`)
        .setColor('#00ff00')
        .addFields(
          { name: 'Gold', value: `${user.character.gold}`, inline: true },
          { name: 'Items', value: inventory.length.toString(), inline: true },
        );

      if (inventory.length === 0) {
        embed.setDescription(
          'Your inventory is empty. Visit the shop with `/shop` to buy some items!',
        );
      } else {
        const itemList = inventory
          .map((inv) => `${inv.item.name} x${inv.qty}`)
          .join('\n');

        embed.setDescription(`**Items:**\n${itemList}`);
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in inv command:', error);
      return interaction.reply({
        content:
          'An error occurred while retrieving your inventory. Please try again.',
        ephemeral: true,
      });
    }
  }
}
