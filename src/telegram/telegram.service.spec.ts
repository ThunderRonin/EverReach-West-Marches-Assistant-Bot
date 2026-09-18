import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { UsersService } from '../users/users.service';
import { EconomyService } from '../economy/economy.service';
import { NotesService } from '../notes/notes.service';

describe('TelegramService', () => {
  const mockUsersService = {
    getUserByTelegramId: jest.fn(),
    findOrCreateTelegramUser: jest.fn(),
    linkTelegramWithCode: jest.fn(),
  };

  const mockEconomyService = {
    getCharacterInventory: jest.fn(),
    getAllItems: jest.fn(),
    buyItem: jest.fn(),
    getTransactionHistory: jest.fn(),
  };

  const mockNotesService = {
    addNote: jest.fn(),
    getUserNotes: jest.fn(),
    searchNotes: jest.fn(),
  };

  const createService = async (token?: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TELEGRAM_BOT_TOKEN') return token;
              if (key === 'GUILD_ID_DEV') return 'guild-dev-123';
              return null;
            }),
          },
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: EconomyService, useValue: mockEconomyService },
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    return {
      service: module.get<TelegramService>(TelegramService),
      config: module.get<ConfigService>(ConfigService),
    };
  };

  it('should be defined', async () => {
    const { service: svc } = await createService();
    expect(svc).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should gracefully disable bot when TELEGRAM_BOT_TOKEN is missing', async () => {
      const { service: svc } = await createService(undefined);
      expect(() => svc.onModuleInit()).not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should cleanly handle teardown without crashing', async () => {
      const { service: svc } = await createService(undefined);
      expect(() => svc.onModuleDestroy()).not.toThrow();
    });
  });
});
