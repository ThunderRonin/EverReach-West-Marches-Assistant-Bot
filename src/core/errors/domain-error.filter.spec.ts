import { BadRequestException } from '@nestjs/common';
import {
  DomainErrorFilter,
  GlobalExceptionFilter,
} from './domain-error.filter';
import { ItemNotFoundError } from './errors';
import {
  createMockInteraction,
  createMockExecutionContext,
} from '../../discord/testing/discord-mock.factory';

describe('DomainErrorFilter & GlobalExceptionFilter', () => {
  describe('DomainErrorFilter', () => {
    let filter: DomainErrorFilter;

    beforeEach(() => {
      filter = new DomainErrorFilter();
    });

    it('should reply with red embed for DomainError on un-replied interaction', () => {
      const interaction = createMockInteraction();
      const host = createMockExecutionContext(interaction);
      const error = new ItemNotFoundError('vorpal_sword');

      filter.catch(error, host);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          ephemeral: true,
          embeds: expect.any(Array),
        }),
      );
    });

    it('should editReply when interaction is already deferred', () => {
      const interaction = createMockInteraction({ isDeferred: true });
      const host = createMockExecutionContext(interaction);
      const error = new ItemNotFoundError('vorpal_sword');

      filter.catch(error, host);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          ephemeral: true,
          embeds: expect.any(Array),
        }),
      );
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });

  describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    it('should format BadRequestException validation messages', () => {
      const interaction = createMockInteraction();
      const host = createMockExecutionContext(interaction);
      const exception = new BadRequestException([
        'Name is too short',
        'Value must be positive',
      ]);

      filter.catch(exception, host);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          ephemeral: true,
          embeds: expect.any(Array),
        }),
      );
    });

    it('should format generic Error instances', () => {
      const interaction = createMockInteraction();
      const host = createMockExecutionContext(interaction);
      const exception = new Error('Database connection failed');

      filter.catch(exception, host);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          ephemeral: true,
          embeds: expect.any(Array),
        }),
      );
    });
  });
});
