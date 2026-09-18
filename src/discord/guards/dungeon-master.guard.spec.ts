import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DungeonMasterGuard } from './dungeon-master.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import {
  createMockInteraction,
  createMockExecutionContext,
} from '../testing/discord-mock.factory';

describe('DungeonMasterGuard', () => {
  let guard: DungeonMasterGuard;
  let permissionsService: PermissionsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'BOT_OWNER_ID') return 'owner_123';
      if (key === 'DM_ROLE_NAME') return 'Dungeon Master';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DungeonMasterGuard,
        PermissionsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<DungeonMasterGuard>(DungeonMasterGuard);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
    expect(permissionsService).toBeDefined();
  });

  it('should allow bot owner anywhere (guild channel)', async () => {
    const interaction = createMockInteraction({
      userId: 'owner_123',
      guildId: 'guild_999',
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('should allow bot owner in direct messages (no guild)', async () => {
    const interaction = createMockInteraction({
      userId: 'owner_123',
      guildId: null,
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('should allow guild member holding the Dungeon Master role', async () => {
    const interaction = createMockInteraction({
      userId: 'dm_user_456',
      guildId: 'guild_999',
      memberRoles: ['Dungeon Master'],
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('should allow guild member holding the DM role with case-insensitive match', async () => {
    const interaction = createMockInteraction({
      userId: 'dm_user_456',
      guildId: 'guild_999',
      memberRoles: ['dungeon master'],
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny non-owner user without DM role in guild and reply with error embed', async () => {
    const interaction = createMockInteraction({
      userId: 'regular_player',
      guildId: 'guild_999',
      memberRoles: ['Player', 'Adventurer'],
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        ephemeral: true,
      }),
    );
  });

  it('should deny non-owner user in DM channel and reply with error embed', async () => {
    const interaction = createMockInteraction({
      userId: 'regular_player',
      guildId: null,
    });
    const context = createMockExecutionContext(interaction);

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
    expect(interaction.reply).toHaveBeenCalledTimes(1);
  });
});
