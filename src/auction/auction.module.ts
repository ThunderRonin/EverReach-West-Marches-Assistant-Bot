import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuctionService } from './auction.service';

@Module({
  imports: [EventEmitterModule],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
