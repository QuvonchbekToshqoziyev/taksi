import { Module } from '@nestjs/common';
import { ScoringEngine } from './scoring.engine';

@Module({
  providers: [ScoringEngine],
  exports: [ScoringEngine],
})
export class ScoringModule {}
