import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Subcommand,
  Options,
  StringOption,
  IntegerOption,
  UserOption,
} from 'necord';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CommandInteraction, EmbedBuilder, User } from 'discord.js';
import { UsersService } from '../../users/users.service';
import { TradeService } from '../../trade/trade.service';
import { PrismaService } from '../../db/prisma.service';
import type { TradeOffer } from '../../config/validation.schemas';
import { TRADE_CONFIG } from '../../config/game.constants';
import { TradeOfferSchema } from '../../config/validation.schemas';
import { GuildOnlyGuard } from '../guards/guild-only.guard';
import { CharacterExistsGuard } from '../guards/character-exists.guard';

const TradeCommand = createCommandGroupDecorator({
  name: 'trade',
  description: 'Trade commands',
});

export class TradeStartDto {
  @UserOption({
    name: 'user',
    description: 'User to trade with',
    required: true,
  })
  user: User;
}

export class TradeAddDto {
  @StringOption({
    name: 'type',
    description: 'Type of offer',
    required: true,
    choices: [
      { name: 'Item', value: 'item' },
      { name: 'Gold', value: 'gold' },
    ],
  })
  @IsEnum(['item', 'gold'])
  type: 'item' | 'gold';

  @IntegerOption({
    name: 'qty',
    description: 'Quantity',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  qty: number;

  @StringOption({
    name: 'key',
    description: 'Item key (for items)',
    required: false,
  })
  @IsOptional()
  @IsString()
  key?: string;
}

@Injectable()
@TradeCommand()
export class TradeCommands {
  constructor(
    private readonly usersService: UsersService,
    private readonly tradeService: TradeService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'start',
    description: 'Start a trade with another user',
  })
  async onTradeStart(
    @Context() [interaction]: [CommandInteraction],
    @Options() { user: targetUser }: TradeStartDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    if (targetUser.id === discordId) {
      return interaction.reply({
        content: 'You cannot trade with yourself!',
        ephemeral: true,
      });
    }

    const [fromUser, toUser] = await Promise.all([
      this.usersService.getUserByDiscordId(discordId, guildId),
      this.usersService.getUserByDiscordId(targetUser.id, guildId),
    ]);

    if (!toUser?.character) {
      return interaction.reply({
        content: `${targetUser.username} needs to register a character first!`,
        ephemeral: true,
      });
    }

    const trade = await this.tradeService.startTrade(
      fromUser!.character!.id,
      toUser!.character!.id,
    );

    const embed = new EmbedBuilder()
      .setTitle('🤝 Trade Started')
      .setColor('#00ff00')
      .setDescription(
        `Trade started between ${fromUser!.character!.name} and ${toUser!.character!.name}`,
      )
      .addFields(
        { name: 'Trade ID', value: trade.id.toString(), inline: true },
        {
          name: 'Expires',
          value: `<t:${Math.floor(trade.expiresAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        { name: 'Status', value: 'PENDING', inline: true },
      )
      .setFooter({
        text: 'Use /trade add to add items or gold to your offer',
      });

    return interaction.reply({
      content: `${targetUser.username}, ${interaction.user.username} wants to trade with you!`,
      embeds: [embed],
    });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'add',
    description: 'Add item or gold to your trade offer',
  })
  async onTradeAdd(
    @Context() [interaction]: [CommandInteraction],
    @Options() { type, key, qty }: TradeAddDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    if (type === 'item' && !key) {
      return interaction.reply({
        content: 'You must specify an item key when adding items to trade.',
        ephemeral: true,
      });
    }

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    const trade = await this.tradeService.getPendingTradeByCharacter(
      user!.character!.id,
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
      user!.character!.id,
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
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'show',
    description: 'Show current pending trade',
  })
  async onTradeShow(@Context() [interaction]: [CommandInteraction]) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    const trade = await this.tradeService.getPendingTradeByCharacter(
      user!.character!.id,
    );

    if (!trade) {
      return interaction.reply({
        content:
          "You don't have any pending trades. Use `/trade start <user>` to start a trade.",
        ephemeral: true,
      });
    }

    const [fromChar, toChar] = await Promise.all([
      this.prisma.character.findUnique({ where: { id: trade.fromCharId } }),
      this.prisma.character.findUnique({ where: { id: trade.toCharId } }),
    ]);

    const offerFrom = TradeOfferSchema.parse(JSON.parse(trade.offerFrom));
    const offerTo = TradeOfferSchema.parse(JSON.parse(trade.offerTo));

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

    const formatOffer = (
      items: TradeOffer['items'],
      gold: number,
      itemMap: typeof fromItems,
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

    if (trade.toCharId === user!.character!.id) {
      embed.setFooter({ text: 'Use /trade accept to accept this trade' });
    } else {
      embed.setFooter({
        text: 'Use /trade add to add more items or gold to your offer',
      });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'accept',
    description: 'Accept the current trade',
  })
  async onTradeAccept(@Context() [interaction]: [CommandInteraction]) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    const trade = await this.tradeService.getPendingTradeByCharacter(
      user!.character!.id,
    );

    if (!trade) {
      return interaction.reply({
        content:
          "You don't have any pending trades. Use `/trade start <user>` to start a trade.",
        ephemeral: true,
      });
    }

    if (trade.toCharId !== user!.character!.id) {
      return interaction.reply({
        content:
          'Only the recipient can accept the trade. Use `/trade show` to view the current trade.',
        ephemeral: true,
      });
    }

    await this.tradeService.acceptTrade(trade.id, user!.character!.id);

    const [fromChar, toChar] = await Promise.all([
      this.prisma.character.findUnique({ where: { id: trade.fromCharId } }),
      this.prisma.character.findUnique({ where: { id: trade.toCharId } }),
    ]);

    const offerFrom = TradeOfferSchema.parse(JSON.parse(trade.offerFrom));
    const offerTo = TradeOfferSchema.parse(JSON.parse(trade.offerTo));

    const embed = new EmbedBuilder()
      .setTitle('✅ Trade Completed')
      .setColor('#00ff00')
      .setDescription(
        `Trade between ${fromChar?.name} and ${toChar?.name} has been completed successfully!`,
      )
      .addFields(
        { name: 'Trade ID', value: trade.id.toString(), inline: true },
        {
          name: 'Completed',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
      );

    const formatTradeDetails = (
      items: TradeOffer['items'],
      gold: number,
      characterName: string,
    ) => {
      const parts: string[] = [];
      if (gold > 0) parts.push(`${gold} gold`);
      if (items.length > 0) parts.push(`${items.length} item(s)`);
      return `${characterName}: ${parts.length > 0 ? parts.join(', ') : 'Nothing'}`;
    };

    embed.addFields({
      name: 'Trade Details',
      value: `${formatTradeDetails(offerFrom.items, offerFrom.gold, fromChar?.name || 'Unknown')}\n${formatTradeDetails(offerTo.items, offerTo.gold, toChar?.name || 'Unknown')}`,
      inline: false,
    });

    return interaction.reply({ embeds: [embed] });
  }
}
