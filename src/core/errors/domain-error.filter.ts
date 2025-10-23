import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { DomainError } from './errors';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const interaction = ctx.getRequest<CommandInteraction>();

    if (!interaction || typeof interaction.reply !== 'function') {
      this.logger.error(
        'DomainErrorFilter was triggered by a non-interaction context.',
        exception.stack,
      );
      return;
    }

    // Create error embed for better formatting
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Error')
      .setDescription(exception.message)
      .setTimestamp();

    const reply = {
      embeds: [embed],
      ephemeral: true,
    };

    this.logger.warn(
      `Domain error in command: ${exception.message}`,
      exception.stack,
    );

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(reply).catch((err) => {
        this.logger.error('Failed to edit reply in DomainErrorFilter:', err);
      });
    } else {
      interaction.reply(reply).catch((err) => {
        this.logger.error('Failed to send reply in DomainErrorFilter:', err);
      });
    }
  }
}

/**
 * Global exception filter for validation and other errors
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const interaction = ctx.getRequest<CommandInteraction>();

    // Ignore non-command interactions
    if (!interaction || typeof interaction.reply !== 'function') {
      this.logger.error(
        'Unexpected error in non-command context:',
        exception instanceof Error ? exception.stack : exception,
      );
      return;
    }

    let errorMessage = 'An unexpected error occurred. Please try again later.';
    let errorColor: [number, number, number] = [255, 0, 0]; // Red RGB

    // Handle validation errors
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;
      if (response.message) {
        if (Array.isArray(response.message)) {
          errorMessage = response.message.join(', ');
        } else {
          errorMessage = response.message;
        }
      }
      errorColor = [255, 170, 0]; // Orange RGB
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setTitle('❌ Error')
      .setDescription(errorMessage)
      .setTimestamp();

    const reply = {
      embeds: [embed],
      ephemeral: true,
    };

    this.logger.error(
      `Unhandled error: ${errorMessage}`,
      exception instanceof Error ? exception.stack : exception,
    );

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(reply).catch((err) => {
        this.logger.error('Failed to edit reply in GlobalExceptionFilter:', err);
      });
    } else {
      interaction.reply(reply).catch((err) => {
        this.logger.error('Failed to send reply in GlobalExceptionFilter:', err);
      });
    }
  }
}
