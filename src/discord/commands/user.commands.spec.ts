import { Test, TestingModule } from '@nestjs/testing';
import { UserCommands } from './user.commands';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';
import { createMockInteraction } from '../testing/discord-mock.factory';

describe('UserCommands', () => {
  let commands: UserCommands;
  let usersService: jest.Mocked<UsersService>;
  let economyService: jest.Mocked<EconomyService>;

  const mockUsersService = {
    getUserByDiscordId: jest.fn(),
    findOrCreateUser: jest.fn(),
  };

  const mockEconomyService = {
    getCharacterInventory: jest.fn(),
    getTransactionHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCommands,
        { provide: UsersService, useValue: mockUsersService },
        { provide: EconomyService, useValue: mockEconomyService },
      ],
    }).compile();

    commands = module.get<UserCommands>(UserCommands);
    usersService = module.get(UsersService);
    economyService = module.get(EconomyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(commands).toBeDefined();
  });

  describe('onRegister', () => {
    it('should deny registration if used outside of a server', async () => {
      const interaction = createMockInteraction({ guildId: null });
      await commands.onRegister([interaction], { name: 'Gimli' });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        }),
      );
    });

    it('should welcome back returning character with matching name', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        discordId: '123',
        guildId: 'guild_1',
        createdAt: new Date(),
        character: {
          id: 10,
          userId: 1,
          name: 'Gimli',
          gold: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onRegister([interaction], { name: 'gimli' });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Welcome back, Gimli!'),
          ephemeral: true,
        }),
      );
    });

    it('should inform user if they already have a character with a different name', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        discordId: '123',
        guildId: 'guild_1',
        createdAt: new Date(),
        character: {
          id: 10,
          userId: 1,
          name: 'Gimli',
          gold: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onRegister([interaction], { name: 'Legolas' });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining(
            'You already have a character named "Gimli"',
          ),
          ephemeral: true,
        }),
      );
    });

    it('should create a new character when none exists', async () => {
      usersService.getUserByDiscordId.mockResolvedValue(null);
      usersService.findOrCreateUser.mockResolvedValue({
        id: 1,
        discordId: '123',
        guildId: 'guild_1',
        createdAt: new Date(),
        character: {
          id: 10,
          userId: 1,
          name: 'Aragorn',
          gold: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onRegister([interaction], { name: 'Aragorn' });

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(
        interaction.user.id,
        'guild_1',
        'Aragorn',
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining(
            'Character "Aragorn" has been created!',
          ),
          ephemeral: true,
        }),
      );
    });
  });

  describe('onInventory', () => {
    it('should render empty inventory embed', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'Legolas', gold: 250 },
      } as any);
      economyService.getCharacterInventory.mockResolvedValue([]);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onInventory([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });

    it('should render inventory items embed', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'Legolas', gold: 250 },
      } as any);
      economyService.getCharacterInventory.mockResolvedValue([
        {
          id: 1,
          characterId: 10,
          itemId: 5,
          qty: 2,
          item: { name: 'Elven Arrow' },
        },
      ] as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onInventory([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });
  });

  describe('onHistory', () => {
    it('should render empty transaction history embed', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'Legolas', gold: 250 },
      } as any);
      economyService.getTransactionHistory.mockResolvedValue([]);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onHistory([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });

    it('should format transaction history payloads correctly', async () => {
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'Legolas', gold: 250 },
      } as any);
      economyService.getTransactionHistory.mockResolvedValue([
        {
          id: 1,
          type: 'BUY',
          payload: JSON.stringify({
            itemId: 1,
            itemKey: 'potion',
            itemName: 'Health Potion',
            quantity: 3,
            totalCost: 150,
          }),
          createdAt: new Date(),
        },
      ] as any);

      const interaction = createMockInteraction({ guildId: 'guild_1' });
      await commands.onHistory([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        }),
      );
    });
  });
});
