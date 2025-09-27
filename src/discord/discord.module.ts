import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscordClient } from './discord.client';
import { DiscordService } from './discord.service';
import { CommandHandler } from './commands/command.handler';
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';
import { TradeModule } from '../trade/trade.module';
import { AuctionModule } from '../auction/auction.module';
import { NotesModule } from '../notes/notes.module';

// Command imports
import { RegisterCommand } from './commands/register.command';
import { InvCommand } from './commands/inv.command';
import { ShopCommand } from './commands/shop.command';
import { BuyCommand } from './commands/buy.command';
import { HistoryCommand } from './commands/history.command';
import { TradeStartCommand } from './commands/trade-start.command';
import { TradeAddCommand } from './commands/trade-add.command';
import { TradeShowCommand } from './commands/trade-show.command';
import { TradeAcceptCommand } from './commands/trade-accept.command';
import { AuctionListCommand } from './commands/auction-list.command';
import { AuctionCreateCommand } from './commands/auction-create.command';
import { AuctionBidCommand } from './commands/auction-bid.command';
import { AuctionMyCommand } from './commands/auction-my.command';
import { NoteAddCommand } from './commands/note-add.command';
import { NoteSearchCommand } from './commands/note-search.command';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    EconomyModule,
    TradeModule,
    AuctionModule,
    NotesModule,
  ],
  providers: [
    DiscordClient,
    DiscordService,
    CommandHandler,
    // Commands
    RegisterCommand,
    InvCommand,
    ShopCommand,
    BuyCommand,
    HistoryCommand,
    TradeStartCommand,
    TradeAddCommand,
    TradeShowCommand,
    TradeAcceptCommand,
    AuctionListCommand,
    AuctionCreateCommand,
    AuctionBidCommand,
    AuctionMyCommand,
    NoteAddCommand,
    NoteSearchCommand,
  ],
  exports: [DiscordService, DiscordClient],
})
export class DiscordModule {}
