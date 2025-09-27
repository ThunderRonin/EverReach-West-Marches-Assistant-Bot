import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { AuctionService } from '../../auction/auction.service';

@Injectable()
export class AuctionBidCommand {
  private readonly logger = new Logger(AuctionBidCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly auctionService: AuctionService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('auction')
    .setDescription('Auction commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('bid')
        .setDescription('Place a bid on an auction')
        .addIntegerOption((option) =>
          option
            .setName('auction_id')
            .setDescription('Auction ID')
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Bid amount')
            .setRequired(true)
            .setMinValue(1),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const auctionId = interaction.options.getInteger('auction_id', true);
      const amount = interaction.options.getInteger('amount', true);
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

      await this.auctionService.placeBid(auctionId, user.character.id, amount);

      const embed = new EmbedBuilder()
        .setTitle('💰 Bid Placed')
        .setColor('#00ff00')
        .setDescription(
          `Successfully placed bid of ${amount} gold on auction #${auctionId}`,
        )
        .addFields(
          { name: 'Auction ID', value: auctionId.toString(), inline: true },
          { name: 'Bid Amount', value: `${amount} gold`, inline: true },
          { name: 'Bidder', value: user.character.name, inline: true },
        )
        .setFooter({
          text: 'Check /auction list to see current auction status',
        });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in auction bid command:', error);

      let errorMessage =
        'An error occurred while placing your bid. Please try again.';

      if (error.message.includes('not found')) {
        errorMessage =
          'Auction not found. Check `/auction list` for active auctions.';
      } else if (error.message.includes('not open')) {
        errorMessage = 'This auction is no longer open for bidding.';
      } else if (error.message.includes('expired')) {
        errorMessage = 'This auction has expired.';
      } else if (error.message.includes('own auction')) {
        errorMessage = 'You cannot bid on your own auction.';
      } else if (error.message.includes('minimum bid')) {
        errorMessage = 'Your bid must be at least the minimum bid amount.';
      } else if (error.message.includes('higher than current')) {
        errorMessage = 'Your bid must be higher than the current highest bid.';
      } else if (error.message.includes('Insufficient gold')) {
        errorMessage = "You don't have enough gold to place this bid.";
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
