import { Injectable } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Subcommand,
  Options,
  StringOption,
  IntegerOption,
} from 'necord';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { UsersService } from '../../users/users.service';
import { AuctionService } from '../../auction/auction.service';

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
  key: string;

  @IntegerOption({
    name: 'qty',
    description: 'Quantity',
    required: true,
    min_value: 1,
  })
  qty: number;

  @IntegerOption({
    name: 'min_bid',
    description: 'Minimum bid',
    required: true,
    min_value: 1,
  })
  minBid: number;

  @IntegerOption({
    name: 'minutes',
    description: 'Duration in minutes',
    required: true,
    min_value: 1,
  })
  minutes: number;
}

export class AuctionBidDto {
  @IntegerOption({
    name: 'auction_id',
    description: 'Auction ID',
    required: true,
    min_value: 1,
  })
  auctionId: number;

  @IntegerOption({
    name: 'amount',
    description: 'Bid amount',
    required: true,
    min_value: 1,
  })
  amount: number;
}

@Injectable()
@AuctionCommand()
export class AuctionCommands {
  constructor(
    private readonly usersService: UsersService,
    private readonly auctionService: AuctionService,
  ) {}

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

  @Subcommand({
    name: 'create',
    description: 'Create a new auction',
  })
  async onAuctionCreate(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key, qty, minBid, minutes }: AuctionCreateDto,
  ) {
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
  }

  @Subcommand({
    name: 'bid',
    description: 'Place a bid on an auction',
  })
  async onAuctionBid(
    @Context() [interaction]: [CommandInteraction],
    @Options() { auctionId, amount }: AuctionBidDto,
  ) {
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
  }

  @Subcommand({
    name: 'my',
    description: 'View your auctions and bids',
  })
  async onAuctionMy(@Context() [interaction]: [CommandInteraction]) {
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

    const { createdAuctions, bids } = await this.auctionService.getUserAuctions(
      user.character.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏺 ${user.character.name}'s Auctions`)
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
                ? bid.auction.currentBidderId === user.character?.id
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
}
