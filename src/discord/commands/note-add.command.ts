import { Injectable, Logger } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { NotesService } from '../../notes/notes.service';

@Injectable()
export class NoteAddCommand {
  private readonly logger = new Logger(NoteAddCommand.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('note')
    .setDescription('Note commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a personal note')
        .addStringOption((option) =>
          option.setName('text').setDescription('Note text').setRequired(true),
        ),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const text = interaction.options.getString('text', true);
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
      }

      if (text.length > 1000) {
        return interaction.reply({
          content:
            'Note text is too long. Please keep it under 1000 characters.',
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

      const note = await this.notesService.addNote(user.id, text);

      const embed = new EmbedBuilder()
        .setTitle('📝 Note Added')
        .setColor('#00ff00')
        .setDescription('Your note has been saved successfully!')
        .addFields(
          { name: 'Note ID', value: note.id.toString(), inline: true },
          { name: 'Length', value: `${text.length} characters`, inline: true },
          {
            name: 'Created',
            value: `<t:${Math.floor(note.createdAt.getTime() / 1000)}:F>`,
            inline: true,
          },
        )
        .setFooter({ text: 'Use /note search to find your notes later' });

      // Show preview of the note (first 100 characters)
      const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      embed.addFields({ name: 'Preview', value: preview, inline: false });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      this.logger.error('Error in note add command:', error);
      return interaction.reply({
        content: 'An error occurred while saving your note. Please try again.',
        ephemeral: true,
      });
    }
  }
}
