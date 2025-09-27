import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { TradeService } from '../../trade/trade.service';

@Injectable()
export class TradeStartCommand {
  private readonly logger = new Logger(TradeStartCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tradeService: TradeService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Start a trade with another user')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to trade with')
            .setRequired(true),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
      }

      if (targetUser.id === discordId) {
        return interaction.reply({
          content: 'You cannot trade with yourself!',
          ephemeral: true,
        });
      }

      // Get both users
      const [fromUser, toUser] = await Promise.all([
        this.usersService.getUserByDiscordId(discordId, guildId),
        this.usersService.getUserByDiscordId(targetUser.id, guildId),
      ]);

      if (!fromUser?.character) {
        return interaction.reply({
          content:
            'You need to register a character first! Use `/register <name>` to get started.',
          ephemeral: true,
        });
      }

      if (!toUser?.character) {
        return interaction.reply({
          content: `${targetUser.username} needs to register a character first!`,
          ephemeral: true,
        });
      }

      const trade = await this.tradeService.startTrade(
        fromUser.character.id,
        toUser.character.id,
      );

      const embed = new EmbedBuilder()
        .setTitle('🤝 Trade Started')
        .setColor('#00ff00')
        .setDescription(
          `Trade started between ${fromUser.character.name} and ${toUser.character.name}`,
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
    } catch (error) {
      this.logger.error('Error in trade start command:', error);

      let errorMessage =
        'An error occurred while starting the trade. Please try again.';

      if (error.message.includes('already has a pending trade')) {
        errorMessage =
          'One of the players already has a pending trade. Please wait for it to complete or expire.';
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
