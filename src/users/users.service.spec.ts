import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../db/prisma.service';
import { CHARACTER_CONFIG } from '../config/game.constants';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    character: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateUser', () => {
    it('should return existing user without creating a new one', async () => {
      const existingUser = {
        id: 1,
        discordId: '123',
        guildId: '456',
        character: { id: 10, name: 'ExistingHero', gold: 100 },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.findOrCreateUser('123', '456');

      expect(result).toEqual(existingUser);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockPrismaService.character.create).not.toHaveBeenCalled();
    });

    it('should create user if user does not exist', async () => {
      const newUser = {
        id: 2,
        discordId: 'new-discord',
        guildId: 'new-guild',
        character: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateUser('new-discord', 'new-guild');

      expect(result).toEqual(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          discordId: 'new-discord',
          guildId: 'new-guild',
        },
        include: {
          character: true,
        },
      });
      expect(mockPrismaService.character.create).not.toHaveBeenCalled();
    });

    it('should create character with starting gold if user exists without character and characterName is provided', async () => {
      const userWithoutChar = {
        id: 3,
        discordId: 'user-3',
        guildId: 'guild-3',
        character: null,
      };

      const refreshedUser = {
        id: 3,
        discordId: 'user-3',
        guildId: 'guild-3',
        character: {
          id: 30,
          userId: 3,
          name: 'HeroOne',
          gold: CHARACTER_CONFIG.STARTING_GOLD,
        },
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(userWithoutChar)
        .mockResolvedValueOnce(refreshedUser);
      mockPrismaService.character.create.mockResolvedValue({
        id: 30,
        userId: 3,
        name: 'HeroOne',
        gold: CHARACTER_CONFIG.STARTING_GOLD,
      });

      const result = await service.findOrCreateUser(
        'user-3',
        'guild-3',
        'HeroOne',
      );

      expect(mockPrismaService.character.create).toHaveBeenCalledWith({
        data: {
          userId: 3,
          name: 'HeroOne',
          gold: CHARACTER_CONFIG.STARTING_GOLD,
        },
      });
      expect(result).toEqual(refreshedUser);
    });
  });

  describe('getUserByDiscordId', () => {
    it('should query user with character and inventory', async () => {
      const mockResult = {
        id: 1,
        discordId: 'discord-1',
        guildId: 'guild-1',
        character: {
          id: 1,
          name: 'Hero',
          inventory: [],
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockResult);

      const result = await service.getUserByDiscordId('discord-1', 'guild-1');

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          discordId_guildId: {
            discordId: 'discord-1',
            guildId: 'guild-1',
          },
        },
        include: {
          character: {
            include: {
              inventory: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });
    });
  });

  describe('updateCharacterGold', () => {
    it('should increment character gold by given amount', async () => {
      const updatedChar = {
        id: 5,
        name: 'RichHero',
        gold: 250,
      };

      mockPrismaService.character.update.mockResolvedValue(updatedChar);

      const result = await service.updateCharacterGold(5, 150);

      expect(result).toEqual(updatedChar);
      expect(mockPrismaService.character.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          gold: {
            increment: 150,
          },
        },
      });
    });
  });
});
