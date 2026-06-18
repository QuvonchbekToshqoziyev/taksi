import { Module } from '@nestjs/common';
import { TelegramRetryService } from './telegram-retry.service';

@Module({
  providers: [TelegramRetryService],
  exports: [TelegramRetryService],
})
export class TelegramRetryModule {}
