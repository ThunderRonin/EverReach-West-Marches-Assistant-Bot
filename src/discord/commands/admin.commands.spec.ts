import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdminCommands } from './admin.commands';
import { PrismaService } from '../../db/prisma.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { DungeonMasterGuard } from '../guards/dungeon-master.guard';
import { createMockInteraction } from '../testing/discord-mock.factory';
import { Collection, GuildMember } from 'discord.js';

describe('AdminCommands', () => {
  let commands: AdminCommands;
  let prisma: any;

  const mockPrismaService = {
    item: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(() => 'Dungeon Master'),
  };

  const mockPermissionsService = {
    hasAdminPermissions: jest.fn(() => true),
    getDMRoleName: jest.fn(() => 'Dungeon Master'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCommands,
        DungeonMasterGuard,
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    commands = module.get<AdminCommands>(AdminCommands);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(commands).toBeDefined();
  });

  describe('onItemAdd', () => {
    it('should create an item and reply with embed when item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);
      prisma.item.create.mockResolvedValue({
        id: 1,
        key: 'mithril_vest',
        name: 'Mithril Vest',
        baseValue: 1200,
      });

      const interaction = createMockInteraction();
      await commands.onItemAdd([interaction], {
        key: 'mithril_vest',
        name: 'Mithril Vest',
        value: 1200,
      });

      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { key: 'mithril_vest' },
      });
      expect(prisma.item.create).toHaveBeenCalledWith({
        data: {
          key: 'mithril_vest',
          name: 'Mithril Vest',
          baseValue: 1200,
        },
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it('should reply with error if item key already exists', async () => {
      prisma.item.findUnique.mockResolvedValue({
        id: 1,
        key: 'iron_sword',
        name: 'Iron Sword',
        baseValue: 50,
      });

      const interaction = createMockInteraction();
      await commands.onItemAdd([interaction], {
        key: 'iron_sword',
        name: 'Iron Sword',
        value: 50,
      });

      expect(prisma.item.create).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });
  });

  describe('onItemUpdate', () => {
    it('should update an existing item and reply with embed', async () => {
      prisma.item.findUnique.mockResolvedValue({
        id: 1,
        key: 'iron_sword',
        name: 'Iron Sword',
        baseValue: 50,
      });
      prisma.item.update.mockResolvedValue({
        id: 1,
        key: 'iron_sword',
        name: 'Fine Iron Sword',
        baseValue: 75,
      });

      const interaction = createMockInteraction();
      await commands.onItemUpdate([interaction], {
        key: 'iron_sword',
        name: 'Fine Iron Sword',
        value: 75,
      });

      expect(prisma.item.update).toHaveBeenCalledWith({
        where: { key: 'iron_sword' },
        data: { name: 'Fine Iron Sword', baseValue: 75 },
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it('should reply with error when item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      const interaction = createMockInteraction();
      await commands.onItemUpdate([interaction], {
        key: 'unknown_item',
        value: 100,
      });

      expect(prisma.item.update).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });
  });

  describe('onItemDelete', () => {
    it('should delete an item when found', async () => {
      prisma.item.findUnique.mockResolvedValue({
        id: 1,
        key: 'trash_item',
        name: 'Trash',
        baseValue: 1,
      });
      prisma.item.delete.mockResolvedValue({});

      const interaction = createMockInteraction();
      await commands.onItemDelete([interaction], { key: 'trash_item' });

      expect(prisma.item.delete).toHaveBeenCalledWith({
        where: { key: 'trash_item' },
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it('should reply with error when item to delete is not found', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      const interaction = createMockInteraction();
      await commands.onItemDelete([interaction], { key: 'ghost_item' });

      expect(prisma.item.delete).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });
  });

  describe('onItemList', () => {
    it('should list all items in the database', async () => {
      prisma.item.findMany.mockResolvedValue([
        { id: 1, key: 'bow', name: 'Shortbow', baseValue: 25 },
        { id: 2, key: 'sword', name: 'Longsword', baseValue: 50 },
      ]);

      const interaction = createMockInteraction();
      await commands.onItemList([interaction]);

      expect(prisma.item.findMany).toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it('should handle empty item database gracefully', async () => {
      prisma.item.findMany.mockResolvedValue([]);

      const interaction = createMockInteraction();
      await commands.onItemList([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });
  });

  describe('onDMList', () => {
    it('should return error if not in a guild', async () => {
      const interaction = createMockInteraction({ guildId: undefined });
      (interaction as any).guild = null;

      await commands.onDMList([interaction]);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it('should list guild members with Dungeon Master role', async () => {
      const interaction = createMockInteraction({ guildId: 'guild_123' });
      const membersCollection = new Collection<string, GuildMember>();

      const dmMember = {
        user: { username: 'Gandalf', id: 'dm_001' },
        roles: {
          cache: new Collection([['r1', { name: 'Dungeon Master' }]]),
        },
      } as unknown as GuildMember;

      const playerMember = {
        user: { username: 'Frodo', id: 'player_002' },
        roles: {
          cache: new Collection([['r2', { name: 'Player' }]]),
        },
      } as unknown as GuildMember;

      membersCollection.set('dm_001', dmMember);
      membersCollection.set('player_002', playerMember);

      (interaction as any).guild = {
        id: 'guild_123',
        members: {
          fetch: jest.fn().mockResolvedValue(membersCollection),
        },
      };

      await commands.onDMList([interaction]);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });
  });
});
