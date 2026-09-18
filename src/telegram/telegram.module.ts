import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [ConfigModule, UsersModule, EconomyModule, NotesModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
