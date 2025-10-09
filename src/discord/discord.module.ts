import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NecordModule } from 'necord';
import { necordConfig } from './necord.config';

// Business modules
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';
import { TradeModule } from '../trade/trade.module';
import { AuctionModule } from '../auction/auction.module';
import { NotesModule } from '../notes/notes.module';

// Command groups
import { UserCommands } from './commands/user.commands';
import { EconomyCommands } from './commands/economy.commands';
import { TradeCommands } from './commands/trade.commands';
import { AuctionCommands } from './commands/auction.commands';
import { NoteCommands } from './commands/note.commands';

// Event listeners
import { ReadyListener } from './listeners/ready.listener';
import { ErrorListener } from './listeners/error.listener';

@Module({
  imports: [
    ConfigModule,
    NecordModule.forRoot(necordConfig()),
    UsersModule,
    EconomyModule,
    TradeModule,
    AuctionModule,
    NotesModule,
  ],
  providers: [
    // Commands
    UserCommands,
    EconomyCommands,
    TradeCommands,
    AuctionCommands,
    NoteCommands,
    // Listeners
    ReadyListener,
    ErrorListener,
  ],
})
export class DiscordModule {}
