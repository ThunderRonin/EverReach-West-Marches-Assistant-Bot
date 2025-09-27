import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { NotesService } from '../../notes/notes.service';

@Injectable()
export class NoteSearchCommand {
  private readonly logger = new Logger(NoteSearchCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('note')
    .setDescription('Note commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('search')
        .setDescription('Search your notes')
        .addStringOption((option) =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const query = interaction.options.getString('query', true);
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

      if (!user) {
        return interaction.reply({
          content:
            'You need to register a character first! Use `/register <name>` to get started.',
          ephemeral: true,
        });
      }

      const results = await this.notesService.searchNotes(user.id, query, 5);

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Search Results for "${query}"`)
        .setColor('#0099ff');

      if (results.length === 0) {
        embed.setDescription('No notes found matching your search query.');
      } else {
        const resultList = results
          .map((result, index) => {
            const similarity = Math.round(result.similarity * 100);
            const date = new Date(result.createdAt).toLocaleDateString();
            const preview =
              result.text.length > 150
                ? result.text.substring(0, 150) + '...'
                : result.text;

            return (
              `**${index + 1}.** (${similarity}% match)\n` +
              `📅 ${date} | ID: ${result.id}\n` +
              `📝 ${preview}`
            );
          })
          .join('\n\n');

        embed.setDescription(resultList);
        embed.setFooter({ text: `${results.length} result(s) found` });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in note search command:', error);
      return interaction.reply({
        content:
          'An error occurred while searching your notes. Please try again.',
        ephemeral: true,
      });
    }
  }
}
