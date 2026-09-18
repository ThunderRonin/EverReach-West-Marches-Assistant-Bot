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
      update: jest.fn(),
      delete: jest.fn(),
    },
    character: {
      create: jest.fn(),
      update: jest.fn(),
    },
    accountLinkToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

  describe('getUserByTelegramId', () => {
    it('should query user by telegramId', async () => {
      const mockUser = {
        id: 7,
        telegramId: 'tg-12345',
        guildId: 'guild-1',
        character: { id: 2, name: 'TelegramHero', gold: 100 },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserByTelegramId('tg-12345');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 'tg-12345' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOrCreateTelegramUser', () => {
    it('should create new telegram user with character if not exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 9,
          telegramId: 'tg-new',
          guildId: 'g1',
          character: { id: 4, name: 'NewChar', gold: 100 },
        });

      mockPrismaService.user.create.mockResolvedValue({
        id: 9,
        telegramId: 'tg-new',
        guildId: 'g1',
        character: null,
      });

      const result = await service.findOrCreateTelegramUser(
        'tg-new',
        'g1',
        'NewChar',
      );

      expect(result?.character?.name).toBe('NewChar');
      expect(mockPrismaService.character.create).toHaveBeenCalledWith({
        data: {
          userId: 9,
          name: 'NewChar',
          gold: CHARACTER_CONFIG.STARTING_GOLD,
        },
      });
    });
  });

  describe('createAccountLinkToken', () => {
    it('should delete existing tokens and create a 6-digit link token', async () => {
      mockPrismaService.accountLinkToken.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.accountLinkToken.create.mockResolvedValue({
        id: 1,
        code: '123456',
        userId: 10,
        expiresAt: new Date(),
      });

      const code = await service.createAccountLinkToken(10);

      expect(code).toMatch(/^\d{6}$/);
      expect(
        mockPrismaService.accountLinkToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: 10 },
      });
      expect(mockPrismaService.accountLinkToken.create).toHaveBeenCalled();
    });
  });

  describe('linkTelegramWithCode', () => {
    it('should return error if code not found', async () => {
      mockPrismaService.accountLinkToken.findUnique.mockResolvedValue(null);

      const result = await service.linkTelegramWithCode('tg-1', '000000');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid link code');
    });

    it('should return error if code is expired', async () => {
      const expiredToken = {
        id: 5,
        code: '111222',
        userId: 10,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      };

      mockPrismaService.accountLinkToken.findUnique.mockResolvedValue(
        expiredToken,
      );

      const result = await service.linkTelegramWithCode('tg-1', '111222');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
      expect(mockPrismaService.accountLinkToken.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it('should link telegramId to user on valid code', async () => {
      const validToken = {
        id: 6,
        code: '654321',
        userId: 20,
        expiresAt: new Date(Date.now() + 600000),
        user: { id: 20, character: { id: 12, name: 'LinkedHero', gold: 500 } },
      };

      mockPrismaService.accountLinkToken.findUnique.mockResolvedValue(
        validToken,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null); // No existing tg user
      mockPrismaService.user.update.mockResolvedValue({
        id: 20,
        telegramId: 'tg-99',
        character: { id: 12, name: 'LinkedHero', gold: 500 },
      });

      const result = await service.linkTelegramWithCode('tg-99', '654321');

      expect(result.success).toBe(true);
      expect(result.user?.character?.name).toBe('LinkedHero');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { telegramId: 'tg-99' },
        include: expect.any(Object),
      });
      expect(mockPrismaService.accountLinkToken.delete).toHaveBeenCalledWith({
        where: { id: 6 },
      });
    });
  });
});
