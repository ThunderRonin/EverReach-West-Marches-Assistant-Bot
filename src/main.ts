import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './db/prisma.service';
import { DomainErrorFilter } from './core/errors/domain-error.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Register global exception filter for domain errors
    app.useGlobalFilters(new DomainErrorFilter());

    // Initialize Prisma
    const prismaService = app.get(PrismaService);
    await prismaService.onModuleInit();

    logger.log('🚀 EverReach Assistant Discord Bot starting...');
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Enable shutdown hooks to properly cleanup
    app.enableShutdownHooks();

    // Start HTTP server (triggers Necord's onApplicationBootstrap which calls client.login())
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`✅ Application started on port ${port}`);

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.log('🛑 Shutting down gracefully...');
      void app.close().then(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      logger.log('🛑 Shutting down gracefully...');
      void app.close().then(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

void bootstrap();
