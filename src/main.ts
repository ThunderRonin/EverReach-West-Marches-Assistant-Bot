import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './db/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Initialize Prisma
    const prismaService = app.get(PrismaService);
    await prismaService.onModuleInit();

    logger.log('🚀 EverReach Assistant Discord Bot starting...');
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Keep the application running (no HTTP server needed for Discord bot)
    process.on('SIGINT', () => {
      logger.log('🛑 Shutting down gracefully...');
      void prismaService.onModuleDestroy().then(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      logger.log('🛑 Shutting down gracefully...');
      void prismaService.onModuleDestroy().then(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

void bootstrap();
