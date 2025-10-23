/**
 * Guild Only Guard
 * Ensures commands are only executed within Discord servers (not DMs)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { CommandInteraction } from 'discord.js';

@Injectable()
export class GuildOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const interaction = context.switchToHttp().getRequest<CommandInteraction>();

    // Guard for Necord Discord interactions
    if (!interaction || typeof interaction.reply !== 'function') {
      return true; // Not a Discord interaction, skip guard
    }

    if (!interaction.guildId) {
      throw new BadRequestException(
        'This command can only be used in a Discord server, not in DMs.',
      );
    }

    return true;
  }
}
