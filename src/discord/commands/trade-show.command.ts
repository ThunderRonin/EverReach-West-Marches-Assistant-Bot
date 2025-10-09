import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { TradeService } from '../../trade/trade.service';
import type { TradeOffer } from '../../trade/trade.service';
import { PrismaService } from '../../db/prisma.service';
import type { Item } from '@prisma/client';

@Injectable()
export class TradeShowCommand {
  private readonly logger = new Logger(TradeShowCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tradeService: TradeService,
    private readonly prisma: PrismaService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade commands')
    .addSubcommand((subcommand) =>
      subcommand.setName('show').setDescription('Show current pending trade'),
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

      // Get character names
      const [fromChar, toChar] = await Promise.all([
        this.prisma.character.findUnique({ where: { id: trade.fromCharId } }),
        this.prisma.character.findUnique({ where: { id: trade.toCharId } }),
      ]);

      const offerFrom = JSON.parse(trade.offerFrom) as TradeOffer;
      const offerTo = JSON.parse(trade.offerTo) as TradeOffer;

      // Get item details for offers
      const fromItemIds = offerFrom.items.map((item) => item.itemId);
      const toItemIds = offerTo.items.map((item) => item.itemId);

      const [fromItems, toItems] = await Promise.all([
        this.prisma.item.findMany({ where: { id: { in: fromItemIds } } }),
        this.prisma.item.findMany({ where: { id: { in: toItemIds } } }),
      ]);

      const embed = new EmbedBuilder()
        .setTitle('🤝 Current Trade')
        .setColor('#0099ff')
        .addFields(
          { name: 'Trade ID', value: trade.id.toString(), inline: true },
          { name: 'Status', value: trade.status, inline: true },
          {
            name: 'Expires',
            value: `<t:${Math.floor(trade.expiresAt.getTime() / 1000)}:R>`,
            inline: true,
          },
        );

      // Format offers
      const formatOffer = (
        items: TradeOffer['items'],
        gold: number,
        itemMap: Item[],
      ) => {
        const parts: string[] = [];
        if (gold > 0) parts.push(`${gold} gold`);
        items.forEach((offerItem) => {
          const item = itemMap.find((i) => i.id === offerItem.itemId);
          if (item) parts.push(`${offerItem.qty}x ${item.name}`);
        });
        return parts.length > 0 ? parts.join(', ') : 'Nothing';
      };

      const fromOffer = formatOffer(offerFrom.items, offerFrom.gold, fromItems);
      const toOffer = formatOffer(offerTo.items, offerTo.gold, toItems);

      embed.addFields(
        {
          name: `${fromChar?.name}'s Offer`,
          value: fromOffer,
          inline: true,
        },
        {
          name: `${toChar?.name}'s Offer`,
          value: toOffer,
          inline: true,
        },
      );

      if (trade.toCharId === user.character.id) {
        embed.setFooter({ text: 'Use /trade accept to accept this trade' });
      } else {
        embed.setFooter({
          text: 'Use /trade add to add more items or gold to your offer',
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in trade show command:', error);
      return interaction.reply({
        content:
          'An error occurred while retrieving trade details. Please try again.',
        ephemeral: true,
      });
    }
  }
}
