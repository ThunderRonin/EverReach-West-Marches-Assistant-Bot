import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CHARACTER_CONFIG } from '../config/game.constants';

export interface LinkedUserResult {
  success: boolean;
  user?: {
    id: number;
    telegramId?: string | null;
    discordId?: string | null;
    character?: {
      id: number;
      name: string;
      gold: number;
    } | null;
  };
  error?: string;
}

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
            gold: CHARACTER_CONFIG.STARTING_GOLD,
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

  async getUserByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: {
        telegramId,
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

  async getUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
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

  async findOrCreateTelegramUser(
    telegramId: string,
    guildId: string,
    characterName?: string,
  ) {
    try {
      let user = await this.prisma.user.findUnique({
        where: { telegramId },
        include: { character: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            telegramId,
            guildId,
          },
          include: { character: true },
        });
        this.logger.log(
          `Created new Telegram user: ${telegramId} in guild ${guildId}`,
        );
      }

      if (!user.character && characterName) {
        await this.prisma.character.create({
          data: {
            userId: user.id,
            name: characterName,
            gold: CHARACTER_CONFIG.STARTING_GOLD,
          },
        });

        user = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: { character: true },
        });
      }

      return user;
    } catch (error) {
      this.logger.error('Error finding or creating Telegram user:', error);
      throw error;
    }
  }

  async createAccountLinkToken(userId: number): Promise<string> {
    // Invalidate existing tokens for this user
    await this.prisma.accountLinkToken.deleteMany({
      where: { userId },
    });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.accountLinkToken.create({
      data: {
        code,
        userId,
        expiresAt,
      },
    });

    return code;
  }

  async linkTelegramWithCode(
    telegramId: string,
    code: string,
  ): Promise<LinkedUserResult> {
    const linkToken = await this.prisma.accountLinkToken.findUnique({
      where: { code },
      include: { user: { include: { character: true } } },
    });

    if (!linkToken) {
      return {
        success: false,
        error: 'Invalid link code. Please check and try again.',
      };
    }

    if (linkToken.expiresAt < new Date()) {
      await this.prisma.accountLinkToken.delete({
        where: { id: linkToken.id },
      });
      return {
        success: false,
        error: 'Link code has expired. Please generate a new one.',
      };
    }

    // Check if telegramId is already linked to another user
    const existingTelegramUser = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { character: true },
    });

    if (existingTelegramUser && existingTelegramUser.id !== linkToken.userId) {
      // If the telegram user has a character, refuse to overwrite without caution
      if (existingTelegramUser.character) {
        return {
          success: false,
          error:
            'This Telegram account already has an active character. Contact an admin to merge.',
        };
      }
      // If existing user has no character, remove the empty placeholder
      await this.prisma.user.delete({ where: { id: existingTelegramUser.id } });
    }

    // Link telegramId to the token's user
    const updatedUser = await this.prisma.user.update({
      where: { id: linkToken.userId },
      data: { telegramId },
      include: {
        character: {
          include: {
            inventory: {
              include: { item: true },
            },
          },
        },
      },
    });

    // Clean up used token
    await this.prisma.accountLinkToken.delete({ where: { id: linkToken.id } });

    this.logger.log(
      `Linked Telegram ID ${telegramId} to User ID ${updatedUser.id}`,
    );
    return { success: true, user: updatedUser };
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
