import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Subcommand,
  Options,
  StringOption,
  IntegerOption,
} from 'necord';
import { IsInt, IsString, Length, MaxLength, Min } from 'class-validator';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { UsersService } from '../../users/users.service';
import { NotesService } from '../../notes/notes.service';
import { NOTES_CONFIG } from '../../config/game.constants';
import { GuildOnlyGuard } from '../guards/guild-only.guard';
import { CharacterExistsGuard } from '../guards/character-exists.guard';

const NoteCommand = createCommandGroupDecorator({
  name: 'note',
  description: 'Note commands',
});

export class NoteAddDto {
  @StringOption({
    name: 'text',
    description: 'Note text',
    required: true,
  })
  @IsString()
  @Length(NOTES_CONFIG.MIN_NOTE_LENGTH, NOTES_CONFIG.MAX_NOTE_LENGTH)
  text: string;
}

export class NoteSearchDto {
  @StringOption({
    name: 'query',
    description: 'Search query',
    required: true,
  })
  @IsString()
  @MaxLength(500)
  query: string;
}

export class NoteDeleteDto {
  @IntegerOption({
    name: 'id',
    description: 'Note ID to delete',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  id: number;
}

@Injectable()
@NoteCommand()
export class NoteCommands {
  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
  ) {}

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'add',
    description: 'Add a personal note',
  })
  async onNoteAdd(
    @Context() [interaction]: [CommandInteraction],
    @Options() { text }: NoteAddDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    if (text.length > 1000) {
      return interaction.reply({
        content: 'Note text is too long. Please keep it under 1000 characters.',
        ephemeral: true,
      });
    }

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    const note = await this.notesService.addNote(user!.id, text);

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

    const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
    embed.addFields({ name: 'Preview', value: preview, inline: false });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'list',
    description: 'List your recent notes',
  })
  async onNoteList(@Context() [interaction]: [CommandInteraction]) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);
    const notes = await this.notesService.getUserNotes(user!.id);

    const embed = new EmbedBuilder()
      .setTitle('📝 Your Notes')
      .setColor('#0099ff');

    if (notes.length === 0) {
      embed.setDescription(
        'You have no notes yet. Add one with `/note add <text>`!',
      );
    } else {
      const noteList = notes
        .map((note) => {
          const date = new Date(note.createdAt).toLocaleDateString();
          const preview =
            note.text.length > 150
              ? note.text.substring(0, 150) + '...'
              : note.text;
          return `**#${note.id}** (${date})\n${preview}`;
        })
        .join('\n\n');

      embed.setDescription(noteList);
      embed.setFooter({ text: `Showing ${notes.length} note(s)` });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'delete',
    description: 'Delete a note by ID',
  })
  async onNoteDelete(
    @Context() [interaction]: [CommandInteraction],
    @Options() { id }: NoteDeleteDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);
    const deleted = await this.notesService.deleteNote(user!.id, id);

    if (!deleted) {
      return interaction.reply({
        content: `❌ Note #${id} not found or does not belong to you.`,
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `✅ Note #${id} has been deleted.`,
      ephemeral: true,
    });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @Subcommand({
    name: 'search',
    description: 'Search your notes',
  })
  async onNoteSearch(
    @Context() [interaction]: [CommandInteraction],
    @Options() { query }: NoteSearchDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    const results = await this.notesService.searchNotes(user!.id, query, 5);

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
  }
}
