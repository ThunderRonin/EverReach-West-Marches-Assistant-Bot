import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { TradeService } from '../../trade/trade.service';

@Injectable()
export class TradeAddCommand {
  private readonly logger = new Logger(TradeAddCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tradeService: TradeService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add item or gold to your trade offer')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Type of offer')
            .setRequired(true)
            .addChoices(
              { name: 'Item', value: 'item' },
              { name: 'Gold', value: 'gold' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('key')
            .setDescription('Item key (for items)')
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('qty')
            .setDescription('Quantity')
            .setRequired(true)
            .setMinValue(1),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const type = interaction.options.getString('type', true) as
        | 'item'
        | 'gold';
      const key = interaction.options.getString('key', false);
      const qty = interaction.options.getInteger('qty', true);
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
      }

      if (type === 'item' && !key) {
        return interaction.reply({
          content: 'You must specify an item key when adding items to trade.',
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

      // Find pending trade
      const trade = await this.tradeService.getPendingTradeByCharacter(
        user.character.id,
      );

      if (!trade) {
        return interaction.reply({
          content:
            "You don't have any pending trades. Use `/trade start <user>` to start a trade.",
          ephemeral: true,
        });
      }

      await this.tradeService.addToTradeOffer(
        trade.id,
        user.character.id,
        type,
        key,
        qty,
      );

      let description = '';
      if (type === 'gold') {
        description = `Added ${qty} gold to your trade offer.`;
      } else {
        description = `Added ${qty}x ${key} to your trade offer.`;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Trade Offer Updated')
        .setColor('#00ff00')
        .setDescription(description)
        .addFields(
          { name: 'Trade ID', value: trade.id.toString(), inline: true },
          {
            name: 'Expires',
            value: `<t:${Math.floor(trade.expiresAt.getTime() / 1000)}:R>`,
            inline: true,
          },
        )
        .setFooter({ text: 'Use /trade show to view the current trade' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in trade add command:', error);

      let errorMessage =
        'An error occurred while updating your trade offer. Please try again.';

      if (error.message.includes('not found')) {
        errorMessage =
          'Item not found. Check the shop with `/shop` for available items.';
      } else if (error.message.includes('Insufficient')) {
        errorMessage = error.message;
      } else if (error.message.includes('expired')) {
        errorMessage =
          'This trade has expired. Start a new trade with `/trade start`.';
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
