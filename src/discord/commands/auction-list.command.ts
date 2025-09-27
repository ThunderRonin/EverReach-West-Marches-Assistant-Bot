import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { AuctionService } from '../../auction/auction.service';

@Injectable()
export class AuctionListCommand {
  private readonly logger = new Logger(AuctionListCommand.name);

  constructor(private readonly auctionService: AuctionService) {}

  data = new SlashCommandBuilder()
    .setName('auction')
    .setDescription('Auction commands')
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List active auctions'),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const auctions = await this.auctionService.getActiveAuctions();

      const embed = new EmbedBuilder()
        .setTitle('🏺 Active Auctions')
        .setColor('#ff9900')
        .setDescription('Current auctions available for bidding:');

      if (auctions.length === 0) {
        embed.setDescription(
          'No active auctions at the moment. Create one with `/auction create`!',
        );
      } else {
        const auctionList = auctions
          .map((auction) => {
            const currentBid = auction.currentBid
              ? `${auction.currentBid} gold`
              : 'No bids';
            const bidder = auction.bidder ? auction.bidder.name : 'None';

            return (
              `**#${auction.id}** ${auction.item.name} x${auction.qty}\n` +
              `Min: ${auction.minBid} gold | Current: ${currentBid}\n` +
              `Bidder: ${bidder} | Ends: <t:${Math.floor(auction.expiresAt.getTime() / 1000)}:R>`
            );
          })
          .join('\n\n');

        embed.setDescription(auctionList);
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in auction list command:', error);
      return interaction.reply({
        content:
          'An error occurred while retrieving auctions. Please try again.',
        ephemeral: true,
      });
    }
  }
}
