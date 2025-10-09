import { Injectable } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';

@Injectable()
export class BuyCommand {
  constructor(
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption((option) =>
      option.setName('key').setDescription('Item key').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('qty')
        .setDescription('Quantity')
        .setRequired(true)
        .setMinValue(1),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);
    const qty = interaction.options.getInteger('qty', true);
    const discordId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    if (!user?.character) {
      return interaction.reply({
        content:
          'You need to register a character first! Use `/register <name>` to get started.',
        ephemeral: true,
      });
    }

    const result = await this.economyService.buyItem(
      user.character.id,
      key,
      qty,
    );

    const embed = new EmbedBuilder()
      .setTitle('✅ Purchase Successful')
      .setColor('#00ff00')
      .setDescription(
        `You bought **${qty}x ${result.item.name}** for **${result.totalCost} gold**`,
      )
      .addFields(
        {
          name: 'Remaining Gold',
          value: `${result.remainingGold}`,
          inline: true,
        },
        { name: 'Item', value: result.item.name, inline: true },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
