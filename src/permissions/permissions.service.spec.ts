import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PermissionsService } from './permissions.service';
import {
  CommandInteraction,
  GuildMember,
  Guild,
  Role,
  Collection,
} from 'discord.js';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'BOT_OWNER_ID') return '123456789';
      if (key === 'DM_ROLE_NAME') return 'Dungeon Master';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isBotOwner', () => {
    it('should return true for bot owner ID', () => {
      expect(service.isBotOwner('123456789')).toBe(true);
    });

    it('should return false for non-owner ID', () => {
      expect(service.isBotOwner('987654321')).toBe(false);
    });
  });

  describe('hasDungeonMasterRole', () => {
    it('should return false if member is null', () => {
      expect(service.hasDungeonMasterRole(null)).toBe(false);
    });

    it('should return true if member has DM role (case-insensitive)', () => {
      const mockMember = {
        roles: {
          cache: [
            { name: 'Player' } as Role,
            { name: 'dungeon master' } as Role,
          ],
        },
      } as unknown as GuildMember;

      expect(service.hasDungeonMasterRole(mockMember)).toBe(true);
    });

    it('should return false if member does not have DM role', () => {
      const mockMember = {
        roles: {
          cache: [{ name: 'Player' } as Role],
        },
      } as unknown as GuildMember;

      expect(service.hasDungeonMasterRole(mockMember)).toBe(false);
    });
  });

  describe('hasAdminPermissions', () => {
    it('should return true if user is bot owner, even in DM', () => {
      const mockInteraction = {
        user: { id: '123456789' },
        guildId: null,
        member: null,
      } as unknown as CommandInteraction;

      expect(service.hasAdminPermissions(mockInteraction)).toBe(true);
    });

    it('should return true if user is in guild and has DM role', () => {
      const mockInteraction = {
        user: { id: '987654321' },
        guildId: 'guild-1',
        member: {
          roles: {
            cache: [{ name: 'Dungeon Master' } as Role],
          },
        },
      } as unknown as CommandInteraction;

      expect(service.hasAdminPermissions(mockInteraction)).toBe(true);
    });

    it('should return false if user is in guild but lacks DM role', () => {
      const mockInteraction = {
        user: { id: '987654321' },
        guildId: 'guild-1',
        member: {
          roles: {
            cache: [{ name: 'Adventurer' } as Role],
          },
        },
      } as unknown as CommandInteraction;

      expect(service.hasAdminPermissions(mockInteraction)).toBe(false);
    });

    it('should return false if not bot owner and in DM', () => {
      const mockInteraction = {
        user: { id: '987654321' },
        guildId: null,
        member: null,
      } as unknown as CommandInteraction;

      expect(service.hasAdminPermissions(mockInteraction)).toBe(false);
    });
  });

  describe('getDMRoleName', () => {
    it('should return the configured DM role name', () => {
      expect(service.getDMRoleName()).toBe('Dungeon Master');
    });
  });

  describe('getDungeonMasters', () => {
    it('should filter guild members having DM role', async () => {
      const dmMember = {
        id: 'user-1',
        roles: {
          cache: [{ name: 'Dungeon Master' } as Role],
        },
      } as unknown as GuildMember;

      const playerMember = {
        id: 'user-2',
        roles: {
          cache: [{ name: 'Player' } as Role],
        },
      } as unknown as GuildMember;

      const mockGuild = {
        id: 'guild-1',
        members: {
          fetch: jest.fn().mockResolvedValue(
            new Collection([
              ['user-1', dmMember],
              ['user-2', playerMember],
            ]),
          ),
        },
      } as unknown as Guild;

      const dms = await service.getDungeonMasters(mockGuild);
      expect(dms).toHaveLength(1);
      expect(dms[0].id).toBe('user-1');
    });
  });
});
