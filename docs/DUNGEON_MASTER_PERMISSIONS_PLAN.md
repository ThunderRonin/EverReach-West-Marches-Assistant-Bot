---
goal: Implement Dungeon Master role-based permission system using Discord roles
version: 2.0
date_created: 2025-10-23
last_updated: 2025-10-23
owner: ThunderRonin
status: 'Planned'
tags: [feature, permissions, admin, architecture, discord-roles]
---

# Dungeon Master Permission System - Implementation Plan (Discord Roles)

A comprehensive plan to implement role-based permissions using Discord's native role system, allowing server admins to designate Dungeon Masters who can manage game content via Discord commands.

## 1. Requirements & Constraints

### Core Requirements

- **REQ-001**: Server admins can create a "Dungeon Master" Discord role in their server
- **REQ-002**: Users with the DM role can execute admin commands (item management, character management, etc.)
- **REQ-003**: Permission checks must work in both guild channels and support bot owner in DMs
- **REQ-004**: DM roles are naturally guild-specific (Discord's built-in behavior)
- **REQ-005**: Bot owner has global admin privileges across all guilds and in DMs
- **REQ-006**: DM permissions persist automatically (managed by Discord)
- **REQ-007**: Bot can list users with DM role in current guild
- **REQ-008**: Role name is configurable per guild via environment variable with fallback defaults

### Security Requirements

- **SEC-001**: Only Discord server admins can assign the DM role (Discord's native permission system)
- **SEC-002**: Permission checks must happen before any database modifications
- **SEC-003**: Failed permission checks must be logged for security auditing
- **SEC-004**: Bot owner Discord ID must be stored securely in environment variables
- **SEC-005**: Bot only needs "View Roles" permission, not "Manage Roles"

### System Constraints

- **CON-001**: Must work with existing Necord command structure
- **CON-002**: Must integrate with current guard system (CharacterExistsGuard, GuildOnlyGuard)
- **CON-003**: No database changes required (use Discord's role system)
- **CON-004**: Must support multiple guilds with different DM role names
- **CON-005**: Bot must have permission to view guild member roles

### Design Guidelines

- **GUD-001**: Use NestJS guards for permission checks
- **GUD-002**: Leverage Discord's native role system (no database storage)
- **GUD-003**: Create reusable `@UseGuards(DungeonMasterGuard)` decorator
- **GUD-004**: Provide clear error messages when permission denied
- **GUD-005**: Use environment variables for bot owner and default role name configuration
- **GUD-006**: Support case-insensitive role name matching
- **GUD-007**: Check for role name as configurable option (e.g., "Dungeon Master", "DM", "Game Master")

## 2. Implementation Steps

### Phase 1: Environment Configuration

**GOAL-001**: Configure bot owner and DM role settings

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `BOT_OWNER_ID` to `.env` file with bot owner's Discord ID | | |
| TASK-002 | Add `DM_ROLE_NAME` to `.env` file (default: "Dungeon Master") | | |
| TASK-003 | Add validation for `BOT_OWNER_ID` in environment schema | | |
| TASK-004 | Add validation for `DM_ROLE_NAME` in environment schema | | |
| TASK-005 | Update `ENV_TEMPLATE.md` documentation with new variables | | |

### Phase 2: Permission Service

**GOAL-002**: Create service to check Discord role-based permissions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `src/permissions/permissions.service.ts` | | |
| TASK-007 | Implement `isBotOwner(discordId: string): boolean` method | | |
| TASK-008 | Implement `hasDungeonMasterRole(member: GuildMember): boolean` method (checks for DM role) | | |
| TASK-009 | Implement `hasAdminPermissions(interaction: CommandInteraction): Promise<boolean>` (checks owner OR DM role) | | |
| TASK-010 | Implement `getDungeonMasters(guild: Guild): Promise<GuildMember[]>` (returns members with DM role) | | |
| TASK-011 | Add case-insensitive role name matching | | |
| TASK-012 | Add error handling for missing permissions and guild context | | |

### Phase 3: Permission Module

**GOAL-003**: Create NestJS module for permissions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create `src/permissions/permissions.module.ts` | | |
| TASK-014 | Export `PermissionsService` for use in other modules | | |
| TASK-015 | Import `ConfigModule` for environment variable access | | |
| TASK-016 | Add `PermissionsModule` to `AppModule` imports | | |

### Phase 4: DM Guard

**GOAL-004**: Create guard for DM permission checks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Create `src/discord/guards/dungeon-master.guard.ts` | | |
| TASK-018 | Implement `canActivate()` method that checks bot owner OR DM role | | |
| TASK-019 | Handle guild commands: check member roles via `interaction.member` | | |
| TASK-020 | Handle DM commands: allow bot owner, deny others | | |
| TASK-021 | Return clear error messages when permission denied | | |
| TASK-022 | Log security events (failed permission checks) | | |

### Phase 5: Update Existing Admin Commands

**GOAL-005**: Apply DM guard to existing admin commands

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Replace manual DM check with `@UseGuards(DungeonMasterGuard)` in `item-add` | | |
| TASK-024 | Replace manual DM check with `@UseGuards(DungeonMasterGuard)` in `item-update` | | |
| TASK-025 | Replace manual DM check with `@UseGuards(DungeonMasterGuard)` in `item-delete` | | |
| TASK-026 | Replace manual DM check with `@UseGuards(DungeonMasterGuard)` in `item-list` | | |
| TASK-027 | Remove old `verifyDMOnly()` method from AdminCommands | | |

### Phase 6: DM Info Commands

**GOAL-006**: Create commands to view DM information

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Create `/admin dm-list` command (shows users with DM role in guild) | | |
| TASK-029 | Add `@UseGuards(DungeonMasterGuard)` to dm-list command | | |
| TASK-030 | Display role name being checked in dm-list output | | |
| TASK-031 | Handle case where no users have DM role | | |

### Phase 7: Testing & Documentation

**GOAL-007**: Test all permission scenarios and document usage

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-032 | Test bot owner can execute admin commands in guilds | | |
| TASK-033 | Test bot owner can execute admin commands in DMs | | |
| TASK-034 | Test user with DM role can execute admin commands in their guild | | |
| TASK-035 | Test user with DM role in Server A cannot use commands in Server B | | |
| TASK-036 | Test user without DM role cannot execute admin commands | | |
| TASK-037 | Test permission denied messages are clear and helpful | | |
| TASK-038 | Test case-insensitive role name matching works | | |
| TASK-039 | Update `DISCORD_SETUP.md` with DM role setup instructions | | |
| TASK-040 | Create `DM_PERMISSIONS_GUIDE.md` with role creation tutorial | | |

## 3. Alternatives

- **ALT-001**: Store DM permissions in database instead of using Discord roles
  - **Rejected**: Discord roles are native, easier to manage, and automatically guild-specific
  
- **ALT-002**: Use Discord's permission system (Administrator/Manage Server)
  - **Rejected**: Too broad - gives access to all bot admin features, not just game management
  
- **ALT-003**: Hardcode role ID instead of role name
  - **Rejected**: Role IDs differ per server; role names are more user-friendly and portable
  
- **ALT-004**: Implement permission levels (Admin, Moderator, DM, Helper)
  - **Deferred**: Can be added later with multiple role names; start with single DM role
  
- **ALT-005**: Check for multiple role names (e.g., "DM", "Dungeon Master", "Game Master")
  - **Accepted**: Will implement as configurable environment variable with fallback list

## 4. Dependencies

- **DEP-001**: Discord.js GuildMember and Role API (already in use)
- **DEP-002**: NestJS ConfigModule (already installed)
- **DEP-003**: Necord guard system (already implemented for other guards)
- **DEP-004**: Bot must have "View Server Members" permission in guilds
- **DEP-005**: No database dependencies required (using Discord's role system)

## 5. Files

### New Files

- **FILE-001**: `src/permissions/permissions.service.ts` - Discord role-based permission checks
- **FILE-002**: `src/permissions/permissions.module.ts` - NestJS module
- **FILE-003**: `src/discord/guards/dungeon-master.guard.ts` - DungeonMasterGuard
- **FILE-004**: `docs/DM_PERMISSIONS_GUIDE.md` - User documentation with role setup tutorial

### Modified Files

- **FILE-005**: `src/discord/commands/admin.commands.ts` - Replace manual checks with guard
- **FILE-006**: `src/app.module.ts` - Import PermissionsModule
- **FILE-007**: `src/discord/discord.module.ts` - Provide DungeonMasterGuard
- **FILE-008**: `.env` - Add BOT_OWNER_ID and DM_ROLE_NAME
- **FILE-009**: `docs/ENV_TEMPLATE.md` - Document new environment variables
- **FILE-010**: `docs/DISCORD_SETUP.md` - Add DM role setup instructions

## 6. Testing

### Unit Tests

- **TEST-001**: PermissionsService.isBotOwner() returns true for owner ID
- **TEST-002**: PermissionsService.isBotOwner() returns false for non-owner
- **TEST-003**: PermissionsService.hasDungeonMasterRole() returns true for member with DM role
- **TEST-004**: PermissionsService.hasDungeonMasterRole() returns false for member without DM role
- **TEST-005**: PermissionsService.hasAdminPermissions() returns true for bot owner
- **TEST-006**: PermissionsService.hasAdminPermissions() returns true for member with DM role
- **TEST-007**: PermissionsService.getDungeonMasters() returns all members with DM role
- **TEST-008**: Role name matching is case-insensitive

### Integration Tests

- **TEST-009**: DungeonMasterGuard allows bot owner in guild commands
- **TEST-010**: DungeonMasterGuard allows bot owner in DM commands
- **TEST-011**: DungeonMasterGuard allows user with DM role in their guild commands
- **TEST-012**: DungeonMasterGuard blocks user with DM role in other guilds
- **TEST-013**: DungeonMasterGuard blocks regular user from admin commands
- **TEST-014**: `/admin dm-list` command displays members with DM role
- **TEST-015**: `/admin item-add` works for bot owner and DM role holders
- **TEST-016**: Admin commands fail gracefully when bot lacks "View Server Members" permission

## 7. Risks & Assumptions

### Risks

- **RISK-001**: If bot owner loses access to their Discord account, no one can manage items globally
  - **Mitigation**: Document process for updating BOT_OWNER_ID in emergency; DMs can still manage in their guilds
  
- **RISK-002**: Server admins might accidentally remove DM role from users
  - **Mitigation**: Document importance of DM role; Discord audit logs track role changes
  
- **RISK-003**: Bot lacks "View Server Members" permission in guild
  - **Mitigation**: Add permission check in guard; provide clear error message with setup instructions
  
- **RISK-004**: Multiple roles with similar names (e.g., "DM", "Dungeon Master")
  - **Mitigation**: Use exact match for configured role name; document role naming best practices

### Assumptions

- **ASSUMPTION-001**: Bot owner Discord ID will not change frequently
- **ASSUMPTION-002**: Each guild will have 1-10 DMs on average
- **ASSUMPTION-003**: Server admins understand how to create and assign Discord roles
- **ASSUMPTION-004**: DM role name will be consistent within each guild (not changed frequently)
- **ASSUMPTION-005**: Guild-specific permissions via roles meet all use cases
- **ASSUMPTION-006**: Bot will have necessary permissions before DMs attempt admin commands

## 8. Related Specifications / Further Reading

- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [Necord Context Decorators](https://necord.org/interactions/application-commands)
- [Discord.js Permissions Guide](https://discord.js.org/#/docs/discord.js/main/class/PermissionsBitField)
- [Prisma Unique Constraints](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-a-unique-field)
- Current project: `/docs/OFFICIAL_PLAN_PROGRESS.md`
