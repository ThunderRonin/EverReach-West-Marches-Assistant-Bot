import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Context,
  createCommandGroupDecorator,
  Subcommand,
  Options,
  StringOption,
  IntegerOption,
} from 'necord';
import { IsString, IsInt, Min, Max, Length } from 'class-validator';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import type { Character } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import {
  AuctionService,
  type AuctionWithRelations,
} from '../../auction/auction.service';
import { AUCTION_CONFIG } from '../../config/game.constants';
import { GuildOnlyGuard } from '../guards/guild-only.guard';
import { CharacterExistsGuard } from '../guards/character-exists.guard';
import { ClientProvider } from '../client.provider';

const AuctionCommand = createCommandGroupDecorator({
  name: 'auction',
  description: 'Auction commands',
});

export class AuctionCreateDto {
  @StringOption({
    name: 'key',
    description: 'Item key',
    required: true,
  })
  @IsString()
  @Length(1, 50)
  key: string;

  @IntegerOption({
    name: 'qty',
    description: 'Quantity',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  qty: number;

  @IntegerOption({
    name: 'min_bid',
    description: 'Minimum bid',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  minBid: number;

  @IntegerOption({
    name: 'minutes',
    description: 'Duration in minutes',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(AUCTION_CONFIG.MIN_DURATION_MINUTES)
  @Max(AUCTION_CONFIG.MAX_DURATION_MINUTES)
  minutes: number;
}

export class AuctionBidDto {
  @IntegerOption({
    name: 'auction_id',
    description: 'Auction ID',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  auctionId: number;

  @IntegerOption({
    name: 'amount',
    description: 'Bid amount',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;
}

@Injectable()
@AuctionCommand()
export class AuctionCommands {
  private readonly logger = new Logger(AuctionCommands.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly auctionService: AuctionService,
    private readonly clientProvider: ClientProvider,
  ) {}

  private async getCharacter(
    interaction: CommandInteraction,
  ): Promise<Character | null> {
    const attached = (
      interaction as CommandInteraction & { character?: Character }
    ).character;
    if (attached) {
      return attached;
    }
    const user = await this.usersService.getUserByDiscordId(
      interaction.user.id,
      interaction.guildId!,
    );
    return user?.character ?? null;
  }

  @Subcommand({
    name: 'list',
    description: 'List active auctions',
  })
  async onAuctionList(@Context() [interaction]: [CommandInteraction]) {
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
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'create',
    description: 'Create a new auction',
  })
  async onAuctionCreate(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key, qty, minBid, minutes }: AuctionCreateDto,
  ) {
    const character = await this.getCharacter(interaction);

    if (!character) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Character Not Found')
        .setColor('#ff0000')
        .setDescription(
          'You need to register a character first! Use `/register <name>` to get started.',
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const auction = await this.auctionService.createAuction(
      character.id,
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

    const reply = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Store message ID for later updates
    if (reply && reply.id && interaction.channelId) {
      await this.auctionService.storeMessageId(
        auction.id,
        reply.id,
        interaction.channelId,
        interaction.guildId!,
      );
    }

    return reply;
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'bid',
    description: 'Place a bid on an auction',
  })
  async onAuctionBid(
    @Context() [interaction]: [CommandInteraction],
    @Options() { auctionId, amount }: AuctionBidDto,
  ) {
    const character = await this.getCharacter(interaction);

    if (!character) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Character Not Found')
        .setColor('#ff0000')
        .setDescription(
          'You need to register a character first! Use `/register <name>` to get started.',
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const updatedAuction = await this.auctionService.placeBid(
      auctionId,
      character.id,
      amount,
    );

    const embed = new EmbedBuilder()
      .setTitle('💰 Bid Placed')
      .setColor('#00ff00')
      .setDescription(
        `Successfully placed bid of ${amount} gold on auction #${auctionId}`,
      )
      .addFields(
        { name: 'Auction ID', value: auctionId.toString(), inline: true },
        { name: 'Bid Amount', value: `${amount} gold`, inline: true },
        { name: 'Bidder', value: character.name, inline: true },
      )
      .setFooter({
        text: 'Check /auction list to see current auction status',
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Update the original auction list message if it exists
    if (updatedAuction && interaction.client) {
      const auctionEmbed = this.buildAuctionEmbed(updatedAuction);
      await this.auctionService.updateAuctionMessage(
        auctionId,
        interaction.client,
        auctionEmbed,
      );
    }

    return;
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'my',
    description: 'View your auctions and bids',
  })
  async onAuctionMy(@Context() [interaction]: [CommandInteraction]) {
    const character = await this.getCharacter(interaction);

    if (!character) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Character Not Found')
        .setColor('#ff0000')
        .setDescription(
          'You need to register a character first! Use `/register <name>` to get started.',
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const { createdAuctions, bids } = await this.auctionService.getUserAuctions(
      character.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏺 ${character.name}'s Auctions`)
      .setColor('#ff9900');

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

    if (bids.length === 0) {
      embed.addFields({
        name: 'Your Bids',
        value: 'No active bids.',
        inline: false,
      });
    } else {
      const bidList = bids
        .map((bid) => {
          const status =
            bid.auction.status === 'OPEN'
              ? '🟢 Open'
              : bid.auction.status === 'SOLD'
                ? bid.auction.currentBidderId === character.id
                  ? '✅ Won'
                  : '❌ Lost'
                : '⏰ Expired';

          return (
            `**Auction #${bid.auctionId}** ${bid.auction.item.name}\n` +
            `Your Bid: ${bid.amount} gold | Status: ${status}`
          );
        })
        .join('\n\n');

      embed.addFields({
        name: 'Your Bids',
        value: bidList,
        inline: false,
      });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /**
   * Build a Discord embed for an auction listing
   */
  private buildAuctionEmbed(auction: AuctionWithRelations): EmbedBuilder {
    const currentBid = auction.currentBid
      ? `${auction.currentBid} gold`
      : 'No bids yet';
    const bidder = auction.bidder ? auction.bidder.name : 'None';
    const timeLeft = `<t:${Math.floor(auction.expiresAt.getTime() / 1000)}:R>`;

    const embed = new EmbedBuilder()
      .setTitle(`🏺 Auction #${auction.id}`)
      .setColor('#ff9900')
      .setDescription(`${auction.qty}x ${auction.item.name}`)
      .addFields(
        { name: 'Seller', value: auction.seller.name, inline: true },
        { name: 'Minimum Bid', value: `${auction.minBid} gold`, inline: true },
        { name: 'Current Bid', value: currentBid, inline: true },
        { name: 'Current Bidder', value: bidder, inline: true },
        { name: 'Time Remaining', value: timeLeft, inline: true },
        { name: 'Status', value: auction.status, inline: true },
      )
      .setFooter({ text: `Use /auction bid ${auction.id} <amount> to bid` });

    return embed;
  }

  /**
   * Event handler for auction.sold - updates Discord message when auction is won
   */
  @OnEvent('auction.sold')
  async onAuctionSold(payload: { auction: AuctionWithRelations }) {
    try {
      const { auction } = payload;

      // Build winner mention
      const winnerMention = auction.bidder?.user?.discordId
        ? `<@${auction.bidder.user.discordId}>`
        : auction.bidder?.name || 'Unknown';

      // Build settlement embed
      const embed = new EmbedBuilder()
        .setTitle(`✅ Auction #${auction.id} - SOLD`)
        .setColor('#00ff00')
        .setDescription(`${auction.qty}x ${auction.item.name}`)
        .addFields(
          { name: 'Item', value: auction.item.name, inline: true },
          { name: 'Seller', value: auction.seller.name, inline: true },
          { name: 'Winner', value: winnerMention, inline: true },
          {
            name: 'Final Price',
            value: `${auction.currentBid} gold`,
            inline: true,
          },
          { name: 'Quantity', value: auction.qty.toString(), inline: true },
          { name: 'Status', value: '✅ Sold', inline: true },
        )
        .setFooter({ text: 'Auction has been settled' });

      // Update the Discord message if we have the client
      const client = this.clientProvider.getClient();
      if (client) {
        await this.auctionService.updateAuctionMessage(
          auction.id,
          client,
          embed,
        );
      }

      this.logger.log(
        `Auction #${auction.id} sold to ${auction.bidder?.name} for ${auction.currentBid} gold`,
      );
    } catch (error) {
      this.logger.error('Error in auction.sold event handler:', error);
    }
  }

  /**
   * Event handler for auction.expired - updates Discord message when auction expires with no bids
   */
  @OnEvent('auction.expired')
  async onAuctionExpired(payload: { auction: AuctionWithRelations }) {
    try {
      const { auction } = payload;

      // Build expiration embed
      const embed = new EmbedBuilder()
        .setTitle(`⏰ Auction #${auction.id} - EXPIRED`)
        .setColor('#ff9900')
        .setDescription(`${auction.qty}x ${auction.item.name}`)
        .addFields(
          { name: 'Item', value: auction.item.name, inline: true },
          { name: 'Seller', value: auction.seller.name, inline: true },
          {
            name: 'Min Bid Required',
            value: `${auction.minBid} gold`,
            inline: true,
          },
          { name: 'Bids Received', value: '0 (No bids)', inline: true },
          {
            name: 'Result',
            value: '❌ Items returned to seller',
            inline: true,
          },
          { name: 'Status', value: 'Expired', inline: true },
        )
        .setFooter({ text: 'Auction expired with no bids - items refunded' });

      // Update the Discord message if we have the client
      const client = this.clientProvider.getClient();
      if (client) {
        await this.auctionService.updateAuctionMessage(
          auction.id,
          client,
          embed,
        );
      }

      this.logger.log(
        `Auction #${auction.id} expired with no bids - items refunded to ${auction.seller.name}`,
      );
    } catch (error) {
      this.logger.error('Error in auction.expired event handler:', error);
    }
  }
}
