import { Module } from '@nestjs/common';
import { MatchingEngine } from './matching.engine';

@Module({
  providers: [MatchingEngine],
  exports: [MatchingEngine],
})
export class MatchingModule {}
