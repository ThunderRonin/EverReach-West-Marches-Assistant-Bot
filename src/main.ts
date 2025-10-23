import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './db/prisma.service';
import {
  DomainErrorFilter,
  GlobalExceptionFilter,
} from './core/errors/domain-error.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Add global validation pipe for class-validator
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties not in DTOs
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties present
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Convert primitives to match types
        },
      }),
    );

    // Register global exception filters (order matters - more specific first)
    app.useGlobalFilters(
      new DomainErrorFilter(),
      new GlobalExceptionFilter(),
    );

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
