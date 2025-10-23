/**
 * Dungeon Master Guard
 * Protects admin commands by checking if user is bot owner or has DM role
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class DungeonMasterGuard implements CanActivate {
  private readonly logger = new Logger(DungeonMasterGuard.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      this.logger.log('[DungeonMasterGuard] canActivate() called');
      
      const request = context.switchToHttp().getRequest();
      this.logger.log(`[DungeonMasterGuard] Request type: ${typeof request}, keys: ${Object.keys(request || {}).slice(0, 5).join(', ')}`);
      
      const interaction = request as CommandInteraction;

      // Verify it's a Discord interaction
      if (!interaction) {
        this.logger.warn('[DungeonMasterGuard] No interaction found - skipping guard');
        return true;
      }

      if (typeof interaction.reply !== 'function') {
        this.logger.warn('[DungeonMasterGuard] No reply function - skipping guard');
        return true;
      }

      const userId = interaction.user.id;
      this.logger.log(`[DungeonMasterGuard] Checking permissions for user ${userId}`);
      
      const hasPermission = await this.permissionsService.hasAdminPermissions(
        interaction,
      );

      this.logger.log(`[DungeonMasterGuard] Permission check result: ${hasPermission}`);

      if (!hasPermission) {
        // Log the failed access attempt
        const guildInfo = interaction.guildId
          ? ` in guild ${interaction.guildId}`
          : ' in DM';
        this.logger.warn(`[DungeonMasterGuard] Unauthorized admin command attempt by ${userId}${guildInfo}`);

        // Send user-friendly error response
        const dmRoleName = this.permissionsService.getDMRoleName();
        const embed = new EmbedBuilder()
          .setTitle('❌ Admin Access Denied')
          .setColor('#ff0000')
          .setDescription(
            interaction.guildId
              ? `You need the **${dmRoleName}** role to use this command in this server.`
              : `Only the bot owner can use this command in DMs.`,
          );

        try {
          await interaction.reply({ embeds: [embed], ephemeral: true });
          this.logger.log('[DungeonMasterGuard] Permission denied message sent');
        } catch (error) {
          this.logger.error('[DungeonMasterGuard] Failed to send permission denied message:', error);
        }

        return false;
      }

      this.logger.log('[DungeonMasterGuard] Permission granted');
      return true;
    } catch (error) {
      this.logger.error('[DungeonMasterGuard] Guard error:', error);
      return false;
    }
  }
}
