import { ExecutionContext } from '@nestjs/common';
import {
  CommandInteraction,
  Guild,
  GuildMember,
  Role,
  TextChannel,
  User,
  Collection,
  PermissionsBitField,
} from 'discord.js';

export interface MockUserOptions {
  id?: string;
  username?: string;
  bot?: boolean;
}

export interface MockMemberOptions {
  id?: string;
  username?: string;
  roles?: string[]; // Array of role names
  permissions?: bigint;
}

export interface MockInteractionOptions {
  userId?: string;
  username?: string;
  guildId?: string | null;
  channelId?: string;
  memberRoles?: string[];
  options?: Record<string, unknown>;
  isDeferred?: boolean;
  isReplied?: boolean;
}

/**
 * Creates a mock Discord User
 */
export function createMockUser(options: MockUserOptions = {}): User {
  const {
    id = '123456789012345678',
    username = 'TestUser',
    bot = false,
  } = options;
  return {
    id,
    username,
    bot,
    tag: `${username}#0001`,
    toString: () => `<@${id}>`,
  } as unknown as User;
}

/**
 * Creates a mock GuildMember with roles Collection
 */
export function createMockGuildMember(
  options: MockMemberOptions = {},
): GuildMember {
  const {
    id = '123456789012345678',
    username = 'TestUser',
    roles = [],
    permissions = PermissionsBitField.Flags.SendMessages |
      PermissionsBitField.Flags.ViewChannel,
  } = options;

  const rolesCollection = new Collection<string, Role>();
  roles.forEach((roleName, index) => {
    const roleId = `role_${index + 1}`;
    rolesCollection.set(roleId, {
      id: roleId,
      name: roleName,
      permissions: new PermissionsBitField(permissions),
    } as unknown as Role);
  });

  const user = createMockUser({ id, username });

  return {
    id,
    user,
    displayName: username,
    roles: {
      cache: rolesCollection,
    },
    permissions: new PermissionsBitField(permissions),
  } as unknown as GuildMember;
}

/**
 * Creates a mock Guild with members and roles collections
 */
export function createMockGuild(
  id = '987654321098765432',
  name = 'Test Guild',
): Guild {
  const membersCollection = new Collection<string, GuildMember>();

  return {
    id,
    name,
    members: {
      fetch: jest.fn().mockResolvedValue(membersCollection),
      cache: membersCollection,
    },
    roles: {
      cache: new Collection<string, Role>(),
    },
  } as unknown as Guild;
}

/**
 * Creates a fully functional mock CommandInteraction / ChatInputCommandInteraction
 */
export function createMockInteraction(
  options: MockInteractionOptions = {},
): CommandInteraction {
  const userId = options.userId ?? '123456789012345678';
  const username = options.username ?? 'TestUser';
  const guildId =
    options.guildId !== undefined ? options.guildId : '987654321098765432';
  const channelId = options.channelId ?? '555555555555555555';
  const memberRoles = options.memberRoles ?? [];
  const interactionOptions = options.options ?? {};
  const isDeferred = options.isDeferred ?? false;
  const isReplied = options.isReplied ?? false;

  const user = createMockUser({ id: userId, username });
  const member = guildId
    ? createMockGuildMember({ id: userId, username, roles: memberRoles })
    : null;
  const guild = guildId ? createMockGuild(guildId) : null;

  const mock = {
    id: 'interaction_12345',
    applicationId: 'app_12345',
    user,
    member,
    guild,
    guildId,
    channelId,
    channel: {
      id: channelId,
      name: 'general',
      isTextBased: () => true,
    } as unknown as TextChannel,
    deferred: isDeferred,
    replied: isReplied,
    ephemeral: false,

    // Methods
    reply: jest.fn().mockImplementation(() => {
      mock.replied = true;
      return Promise.resolve(undefined);
    }),
    deferReply: jest
      .fn()
      .mockImplementation((opts?: { ephemeral?: boolean }) => {
        mock.deferred = true;
        if (opts?.ephemeral) {
          mock.ephemeral = true;
        }
        return Promise.resolve(undefined);
      }),
    editReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    deleteReply: jest.fn().mockResolvedValue(undefined),

    // Options getter
    options: {
      getString: jest.fn(
        (name: string) => (interactionOptions[name] as string) ?? null,
      ),
      getInteger: jest.fn(
        (name: string) => (interactionOptions[name] as number) ?? null,
      ),
      getNumber: jest.fn(
        (name: string) => (interactionOptions[name] as number) ?? null,
      ),
      getBoolean: jest.fn(
        (name: string) => (interactionOptions[name] as boolean) ?? null,
      ),
      getUser: jest.fn(
        (name: string) => (interactionOptions[name] as User) ?? null,
      ),
      getMember: jest.fn(
        (name: string) => (interactionOptions[name] as GuildMember) ?? null,
      ),
      get: jest.fn((name: string) => ({ value: interactionOptions[name] })),
    },
  };

  return mock as unknown as CommandInteraction;
}

/**
 * Creates a mock NestJS ExecutionContext wrapping a Necord interaction
 */
export function createMockExecutionContext(
  interaction: CommandInteraction,
): ExecutionContext {
  return {
    getArgs: () => [interaction],
    getArgByIndex: (index: number) => (index === 0 ? interaction : undefined),
    switchToHttp: () => ({
      getRequest: () => interaction,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    getType: () => 'http',
    getClass: () => class MockController {},
    getHandler: () => function mockHandler() {},
  } as unknown as ExecutionContext;
}
