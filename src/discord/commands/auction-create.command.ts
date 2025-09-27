import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { AuctionService } from '../../auction/auction.service';

@Injectable()
export class AuctionCreateCommand {
  private readonly logger = new Logger(AuctionCreateCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly auctionService: AuctionService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('auction')
    .setDescription('Auction commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new auction')
        .addStringOption((option) =>
          option.setName('key').setDescription('Item key').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('qty')
            .setDescription('Quantity')
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('min_bid')
            .setDescription('Minimum bid')
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('minutes')
            .setDescription('Duration in minutes')
            .setRequired(true)
            .setMinValue(1),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const key = interaction.options.getString('key', true);
      const qty = interaction.options.getInteger('qty', true);
      const minBid = interaction.options.getInteger('min_bid', true);
      const minutes = interaction.options.getInteger('minutes', true);
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

      const auction = await this.auctionService.createAuction(
        user.character.id,
        key,
        qty,
        minBid,
        minutes,
      );

      const embed = new EmbedBuilder()
        .setTitle('🏺 Auction Created')
        .setColor('#00ff00')
        .setDescription(`Auction created for ${qty}x ${auction.item.name}`)
        .addFields(
          { name: 'Auction ID', value: auction.id.toString(), inline: true },
          { name: 'Item', value: auction.item.name, inline: true },
          { name: 'Quantity', value: qty.toString(), inline: true },
          { name: 'Starting Bid', value: `${minBid} gold`, inline: true },
          { name: 'Duration', value: `${minutes} minutes`, inline: true },
          {
            name: 'Ends',
            value: `<t:${Math.floor(auction.expiresAt.getTime() / 1000)}:R>`,
            inline: true,
          },
        )
        .setFooter({ text: 'Use /auction bid <id> <amount> to place a bid' });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Error in auction create command:', error);

      let errorMessage =
        'An error occurred while creating the auction. Please try again.';

      if (error.message.includes('not found')) {
        errorMessage =
          'Item not found. Check the shop with `/shop` for available items.';
      } else if (error.message.includes('Insufficient items')) {
        errorMessage =
          "You don't have enough of this item to auction. Check your inventory with `/inv`.";
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
