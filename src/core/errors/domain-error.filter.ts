import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Interaction } from 'discord.js';
import { DomainError } from './errors';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const interaction = ctx.getRequest<Interaction>();

    if (!interaction || !interaction.isCommand()) {
      this.logger.error(
        'DomainErrorFilter was triggered by a non-command interaction.',
        exception.stack,
      );
      return;
    }

    const reply = {
      content: `⚠️ ${exception.message}`,
      ephemeral: true,
    };

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
