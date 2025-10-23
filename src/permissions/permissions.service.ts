import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandInteraction, GuildMember, Guild } from 'discord.js';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly botOwnerId: string;
  private readonly dmRoleName: string;

  constructor(private readonly configService: ConfigService) {
    this.botOwnerId = this.configService.get<string>('BOT_OWNER_ID') || '';
    this.dmRoleName = this.configService.get<string>('DM_ROLE_NAME') || 'Dungeon Master';
  }

  /**
   * Check if a user is the bot owner
   * Bot owner has full admin privileges everywhere
   */
  isBotOwner(discordId: string): boolean {
    return discordId === this.botOwnerId;
  }

  /**
   * Check if a guild member has the Dungeon Master role
   * Uses case-insensitive role name matching
   */
  hasDungeonMasterRole(member: GuildMember | null): boolean {
    if (!member) {
      return false;
    }

    // Check if member has a role with the configured name (case-insensitive)
    return member.roles.cache.some(
      (role) => role.name.toLowerCase() === this.dmRoleName.toLowerCase(),
    );
  }

  /**
   * Check if an interaction user has admin permissions
   * Allows: bot owner (anywhere) OR user with DM role (in guild)
   */
  async hasAdminPermissions(interaction: CommandInteraction): Promise<boolean> {
    const discordId = interaction.user.id;
    this.logger.log(`[hasAdminPermissions] Checking permissions for user ${discordId}`);

    // Bot owner always has permissions
    if (this.isBotOwner(discordId)) {
      this.logger.log(`[hasAdminPermissions] User is bot owner - granting access`);
      return true;
    }

    // In guild: check for DM role
    if (interaction.guildId && interaction.member) {
      this.logger.log(`[hasAdminPermissions] In guild ${interaction.guildId}, checking for DM role`);
      const hasDMRole = this.hasDungeonMasterRole(interaction.member as GuildMember);
      this.logger.log(`[hasAdminPermissions] DM role check result: ${hasDMRole}`);
      return hasDMRole;
    }

    this.logger.log(`[hasAdminPermissions] Not in guild and not bot owner - denying access`);
    // In DM: only bot owner is allowed (already checked above)
    return false;
  }

  /**
   * Get all members in a guild who have the Dungeon Master role
   */
  async getDungeonMasters(guild: Guild): Promise<GuildMember[]> {
    try {
      const members = await guild.members.fetch();
      const dms = members.filter((member) =>
        this.hasDungeonMasterRole(member),
      );
      return Array.from(dms.values());
    } catch (error) {
      this.logger.error(
        `Failed to fetch dungeon masters for guild ${guild.id}:`,
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  }

  /**
   * Get the DM role name currently being checked
   */
  getDMRoleName(): string {
    return this.dmRoleName;
  }
}
