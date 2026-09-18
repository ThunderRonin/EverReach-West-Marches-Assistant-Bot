import { Test, TestingModule } from '@nestjs/testing';
import { NoteCommands } from './note.commands';
import { UsersService } from '../../users/users.service';
import { NotesService } from '../../notes/notes.service';
import { createMockInteraction } from '../testing/discord-mock.factory';

describe('NoteCommands', () => {
  let commands: NoteCommands;
  let usersService: jest.Mocked<UsersService>;
  let notesService: jest.Mocked<NotesService>;

  const mockUsersService = {
    getUserByDiscordId: jest.fn(),
  };

  const mockNotesService = {
    addNote: jest.fn(),
    getUserNotes: jest.fn(),
    deleteNote: jest.fn(),
    searchNotes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteCommands,
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    commands = module.get<NoteCommands>(NoteCommands);
    usersService = module.get(UsersService);
    notesService = module.get(NotesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(commands).toBeDefined();
  });

  describe('onNoteAdd', () => {
    it('should add a note and reply with embed', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({ id: 5 } as any);
      notesService.addNote.mockResolvedValue({
        id: 1,
        userId: 5,
        text: 'Met the blacksmith today',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onNoteAdd([interaction], {
        text: 'Met the blacksmith today',
      });

      expect(notesService.addNote).toHaveBeenCalledWith(
        5,
        'Met the blacksmith today',
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });
  });

  describe('onNoteList', () => {
    it('should list notes for user', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({ id: 5 } as any);
      notesService.getUserNotes.mockResolvedValue([
        { id: 1, text: 'Note 1', createdAt: new Date() },
        { id: 2, text: 'Note 2', createdAt: new Date() },
      ] as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onNoteList([interaction]);

      expect(notesService.getUserNotes).toHaveBeenCalledWith(5);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });
  });

  describe('onNoteDelete', () => {
    it('should delete a note and reply with success', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({ id: 5 } as any);
      notesService.deleteNote.mockResolvedValue(true);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onNoteDelete([interaction], { id: 1 });

      expect(notesService.deleteNote).toHaveBeenCalledWith(5, 1);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('has been deleted'),
          ephemeral: true,
        }),
      );
    });

    it('should reply with error if note not found', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({ id: 5 } as any);
      notesService.deleteNote.mockResolvedValue(false);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onNoteDelete([interaction], { id: 99 });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining(
            'not found or does not belong to you',
          ),
          ephemeral: true,
        }),
      );
    });
  });

  describe('onNoteSearch', () => {
    it('should search notes and return search results embed', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({ id: 5 } as any);
      notesService.searchNotes.mockResolvedValue([
        {
          id: 1,
          text: 'Blacksmith location',
          similarity: 0.85,
          createdAt: new Date(),
        },
      ] as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onNoteSearch([interaction], { query: 'blacksmith' });

      expect(notesService.searchNotes).toHaveBeenCalledWith(5, 'blacksmith', 5);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });
  });
});
