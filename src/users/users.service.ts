import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateUser(
    discordId: string,
    guildId: string,
    characterName?: string,
  ) {
    try {
      // Try to find existing user
      let user = await this.prisma.user.findUnique({
        where: {
          discordId_guildId: {
            discordId,
            guildId,
          },
        },
        include: {
          character: true,
        },
      });

      if (!user) {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            discordId,
            guildId,
          },
          include: {
            character: true,
          },
        });
        this.logger.log(`Created new user: ${discordId} in guild ${guildId}`);
      }

      // Create character if it doesn't exist and name is provided
      if (!user.character && characterName) {
        await this.prisma.character.create({
          data: {
            userId: user.id,
            name: characterName,
            gold: 100, // Starting gold
          },
        });

        // Refresh user with character
        user = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: {
            character: true,
          },
        });
      }

      return user;
    } catch (error) {
      this.logger.error('Error finding or creating user:', error);
      throw error;
    }
  }

  async getUserByDiscordId(discordId: string, guildId: string) {
    return this.prisma.user.findUnique({
      where: {
        discordId_guildId: {
          discordId,
          guildId,
        },
      },
      include: {
        character: {
          include: {
            inventory: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });
  }

  async updateCharacterGold(characterId: number, goldChange: number) {
    return this.prisma.character.update({
      where: { id: characterId },
      data: {
        gold: {
          increment: goldChange,
        },
      },
    });
  }
}
