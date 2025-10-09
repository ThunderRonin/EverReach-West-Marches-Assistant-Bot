import { Injectable, Logger } from '@nestjs/common';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RegisterCommand {
  private readonly logger = new Logger(RegisterCommand.name);

  constructor(private readonly usersService: UsersService) {}

  data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register a new character')
    .addStringOption((option) =>
      option.setName('name').setDescription('Character name').setRequired(true),
    );

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const name = interaction.options.getString('name', true);
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
      }

      const user = await this.usersService.findOrCreateUser(
        discordId,
        guildId,
        name,
      );

      if (user?.character) {
        if (user.character.name === name) {
          return interaction.reply({
            content: `Welcome back, ${name}! Your character is ready to go.`,
            ephemeral: true,
          });
        } else {
          return interaction.reply({
            content: `You already have a character named "${user.character.name}". Use a different name or contact a GM to change it.`,
            ephemeral: true,
          });
        }
      }

      return interaction.reply({
        content: `Character "${name}" has been created! You start with 100 gold. Use \`/inv\` to see your inventory.`,
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error('Error in register command:', error);
      return interaction.reply({
        content:
          'An error occurred while registering your character. Please try again.',
        ephemeral: true,
      });
    }
  }
}
