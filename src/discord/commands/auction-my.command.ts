import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { AuctionService } from '../../auction/auction.service';

@Injectable()
export class AuctionMyCommand {
  private readonly logger = new Logger(AuctionMyCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly auctionService: AuctionService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('auction')
    .setDescription('Auction commands')
    .addSubcommand((subcommand) =>
      subcommand.setName('my').setDescription('View your auctions and bids'),
    );

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

      const { createdAuctions, bids } =
        await this.auctionService.getUserAuctions(user.character.id);

      const embed = new EmbedBuilder()
        .setTitle(`🏺 ${user.character.name}'s Auctions`)
        .setColor('#ff9900');

      // Created auctions
      if (createdAuctions.length === 0) {
        embed.addFields({
          name: 'Created Auctions',
          value: 'No auctions created yet.',
          inline: false,
        });
      } else {
        const auctionList = createdAuctions
          .map((auction) => {
            const currentBid = auction.currentBid
              ? `${auction.currentBid} gold`
              : 'No bids';
            const bidder = auction.bidder ? auction.bidder.name : 'None';
            const status =
              auction.status === 'OPEN'
                ? '🟢 Open'
                : auction.status === 'SOLD'
                  ? '✅ Sold'
                  : auction.status === 'EXPIRED'
                    ? '⏰ Expired'
                    : '❌ Cancelled';

            return (
              `**#${auction.id}** ${auction.item.name} x${auction.qty}\n` +
              `Status: ${status} | Min: ${auction.minBid} gold\n` +
              `Current: ${currentBid} | Bidder: ${bidder}`
            );
          })
          .join('\n\n');

        embed.addFields({
          name: 'Created Auctions',
          value: auctionList,
          inline: false,
        });
      }

      // Bids placed
      if (bids.length === 0) {
        embed.addFields({
          name: 'Bids Placed',
          value: 'No bids placed yet.',
          inline: false,
        });
      } else {
        const bidList = bids
          .slice(0, 10)
          .map((bid) => {
            const auction = bid.auction;
            const isWinning = auction.currentBidderId === user.character!.id;
            const status =
              auction.status === 'OPEN'
                ? isWinning
                  ? '🏆 Winning'
                  : '📈 Outbid'
                : auction.status === 'SOLD'
                  ? isWinning
                    ? '✅ Won'
                    : '❌ Lost'
                  : '⏰ Expired';

            return (
              `**#${auction.id}** ${auction.item.name} x${auction.qty}\n` +
              `Bid: ${bid.amount} gold | Status: ${status}`
            );
          })
          .join('\n\n');

        embed.addFields({ name: 'Recent Bids', value: bidList, inline: false });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in auction my command:', error);
      return interaction.reply({
        content:
          'An error occurred while retrieving your auction information. Please try again.',
        ephemeral: true,
      });
    }
  }
}
