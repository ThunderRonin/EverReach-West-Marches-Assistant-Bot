import { Test, TestingModule } from '@nestjs/testing';
import { TradeCommands } from './trade.commands';
import { UsersService } from '../../users/users.service';
import { TradeService } from '../../trade/trade.service';
import { PrismaService } from '../../db/prisma.service';
import {
  createMockInteraction,
  createMockUser,
} from '../testing/discord-mock.factory';

describe('TradeCommands', () => {
  let commands: TradeCommands;
  let usersService: jest.Mocked<UsersService>;
  let tradeService: jest.Mocked<TradeService>;

  const mockUsersService = {
    getUserByDiscordId: jest.fn(),
  };

  const mockTradeService = {
    startTrade: jest.fn(),
    getPendingTradeByCharacter: jest.fn(),
    addToTradeOffer: jest.fn(),
    acceptTrade: jest.fn(),
    cancelTrade: jest.fn(),
  };

  const mockPrismaService = {
    character: {
      findUnique: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeCommands,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TradeService, useValue: mockTradeService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    commands = module.get<TradeCommands>(TradeCommands);
    usersService = module.get(UsersService);
    tradeService = module.get(TradeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(commands).toBeDefined();
  });

  describe('onTradeStart', () => {
    it('should reject trading with oneself', async () => {
      const interaction = createMockInteraction({ userId: 'user_1' });
      const targetUser = createMockUser({ id: 'user_1' });

      await commands.onTradeStart([interaction], { user: targetUser });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'You cannot trade with yourself!',
          ephemeral: true,
        }),
      );
    });

    it('should reject if target user has no character', async () => {
      const interaction = createMockInteraction({ userId: 'user_1' });
      const targetUser = createMockUser({ id: 'user_2', username: 'Bob' });

      usersService.getUserByDiscordId
        .mockResolvedValueOnce({
          id: 1,
          character: { id: 10, name: 'AliceChar' },
        } as any)
        .mockResolvedValueOnce({ id: 2, character: null } as any);

      await commands.onTradeStart([interaction], { user: targetUser });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Bob needs to register a character first!',
          ephemeral: true,
        }),
      );
    });

    it('should start trade and announce to users', async () => {
      const interaction = createMockInteraction({ userId: 'user_1' });
      const targetUser = createMockUser({ id: 'user_2', username: 'Bob' });

      usersService.getUserByDiscordId
        .mockResolvedValueOnce({
          id: 1,
          character: { id: 10, name: 'AliceChar' },
        } as any)
        .mockResolvedValueOnce({
          id: 2,
          character: { id: 20, name: 'BobChar' },
        } as any);

      tradeService.startTrade.mockResolvedValue({
        id: 77,
        fromCharId: 10,
        toCharId: 20,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 300000),
      } as any);

      await commands.onTradeStart([interaction], { user: targetUser });

      expect(tradeService.startTrade).toHaveBeenCalledWith(10, 20);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });
  });

  describe('onTradeCancel', () => {
    it('should reply with error if no pending trade exists', async () => {
      const interaction = createMockInteraction({ userId: 'user_1' });
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'AliceChar' },
      } as any);
      tradeService.getPendingTradeByCharacter.mockResolvedValue(null);

      await commands.onTradeCancel([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "You don't have any pending trades to cancel.",
          ephemeral: true,
        }),
      );
    });

    it('should cancel trade when pending trade exists', async () => {
      const interaction = createMockInteraction({ userId: 'user_1' });
      usersService.getUserByDiscordId.mockResolvedValue({
        id: 1,
        character: { id: 10, name: 'AliceChar' },
      } as any);
      tradeService.getPendingTradeByCharacter.mockResolvedValue({
        id: 55,
        fromCharId: 10,
        toCharId: 20,
      } as any);
      tradeService.cancelTrade.mockResolvedValue({
        id: 55,
        status: 'CANCELLED',
      } as any);

      await commands.onTradeCancel([interaction]);

      expect(tradeService.cancelTrade).toHaveBeenCalledWith(55, 10);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });
  });
});
