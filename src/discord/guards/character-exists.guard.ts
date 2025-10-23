/**
 * Character Exists Guard
 * Ensures the Discord user has a registered character before allowing command execution
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { UsersService } from '../../users/users.service';

@Injectable()
export class CharacterExistsGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.switchToHttp().getRequest<CommandInteraction>();

    // Guard for Necord Discord interactions
    if (!interaction || typeof interaction.reply !== 'function') {
      return true; // Not a Discord interaction, skip guard
    }

    const discordId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      throw new BadRequestException('This command can only be used in a server.');
    }

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    if (!user?.character) {
      throw new BadRequestException(
        'You need to register a character first! Use `/register <name>` to get started.',
      );
    }

    // Attach character to request for use in command handler
    (context.switchToHttp().getRequest() as any).character = user.character;

    return true;
  }
}
