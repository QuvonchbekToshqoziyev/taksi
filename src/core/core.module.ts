import { Module } from '@nestjs/common';
import { ParsingModule } from './parsing/parsing.module';
import { ScoringModule } from './scoring/scoring.module';
import { MatchingModule } from './matching/matching.module';
import { StateModule } from './state/state.module';
import { LoggingModule } from './logging/logging.module';
import { TelegramRetryModule } from './telegram/telegram-retry.module';

@Module({
  imports: [
    ParsingModule,
    ScoringModule,
    MatchingModule,
    StateModule,
    LoggingModule,
    TelegramRetryModule,
  ],
  exports: [
    ParsingModule,
    ScoringModule,
    MatchingModule,
    StateModule,
    LoggingModule,
    TelegramRetryModule,
  ],
})
export class CoreModule {}
