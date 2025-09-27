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

@Injectable()
export class TradeAcceptCommand {
  private readonly logger = new Logger(TradeAcceptCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tradeService: TradeService,
    private readonly prisma: PrismaService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade commands')
    .addSubcommand((subcommand) =>
      subcommand.setName('accept').setDescription('Accept the current trade'),
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

      // Only the "to" character can accept
      if (trade.toCharId !== user.character.id) {
        return interaction.reply({
          content:
            'Only the recipient can accept the trade. Use `/trade show` to view the current trade.',
          ephemeral: true,
        });
      }

      await this.tradeService.acceptTrade(trade.id, user.character.id);

      // Get character names for the success message
      const [fromChar, toChar] = await Promise.all([
        this.prisma.character.findUnique({ where: { id: trade.fromCharId } }),
        this.prisma.character.findUnique({ where: { id: trade.toCharId } }),
      ]);

      const offerFrom = JSON.parse(trade.offerFrom) as TradeOffer;
      const offerTo = JSON.parse(trade.offerTo) as TradeOffer;

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

      // Format what was traded
      const formatTradeDetails = (
        items: TradeOffer['items'],
        gold: number,
        characterName: string,
      ) => {
        const parts = [];
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
    } catch (error: unknown) {
      this.logger.error('Error in trade accept command:', error);

      let errorMessage =
        'An error occurred while accepting the trade. Please try again.';

      if (error instanceof Error) {
        const { message } = error;
        if (message.includes('Insufficient')) {
          errorMessage = message;
        } else if (message.includes('expired')) {
          errorMessage =
            'This trade has expired. Start a new trade with `/trade start`.';
        } else if (message.includes('not pending')) {
          errorMessage = 'This trade is no longer pending.';
        }
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
