import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharacterExistsGuard } from './character-exists.guard';
import { UsersService } from '../../users/users.service';
import {
  createMockInteraction,
  createMockExecutionContext,
} from '../testing/discord-mock.factory';

describe('CharacterExistsGuard', () => {
  let guard: CharacterExistsGuard;
  let usersService: jest.Mocked<UsersService>;

  const mockCharacter = {
    id: 1,
    userId: 10,
    name: 'Elendor',
    gold: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    getUserByDiscordId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharacterExistsGuard,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    guard = module.get<CharacterExistsGuard>(CharacterExistsGuard);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass and attach character to interaction when character exists', async () => {
    usersService.getUserByDiscordId.mockResolvedValue({
      id: 10,
      discordId: '123456789',
      guildId: 'guild_999',
      createdAt: new Date(),
      character: mockCharacter,
    } as any);

    const interaction = createMockInteraction({
      userId: '123456789',
      guildId: 'guild_999',
    }) as any;
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(interaction.character).toEqual(mockCharacter);
    expect(usersService.getUserByDiscordId).toHaveBeenCalledWith(
      '123456789',
      'guild_999',
    );
  });

  it('should throw BadRequestException if guildId is missing', async () => {
    const interaction = createMockInteraction({
      userId: '123456789',
      guildId: null,
    });
    const context = createMockExecutionContext(interaction);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new BadRequestException('This command can only be used in a server.'),
    );
  });

  it('should throw BadRequestException if user has no character', async () => {
    usersService.getUserByDiscordId.mockResolvedValue({
      id: 10,
      discordId: '123456789',
      guildId: 'guild_999',
      createdAt: new Date(),
      character: null,
    } as any);

    const interaction = createMockInteraction({
      userId: '123456789',
      guildId: 'guild_999',
    });
    const context = createMockExecutionContext(interaction);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new BadRequestException(
        'You need to register a character first! Use `/register <name>` to get started.',
      ),
    );
  });

  it('should skip guard if context argument is not a Discord interaction', async () => {
    const nonDiscordContext = {
      getArgs: () => [{ notAnInteraction: true }],
    } as any;

    const result = await guard.canActivate(nonDiscordContext);
    expect(result).toBe(true);
  });
});
