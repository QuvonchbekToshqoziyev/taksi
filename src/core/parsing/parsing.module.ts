import { Module } from '@nestjs/common';
import { ParsingEngine } from './parsing.engine';
import { KeywordModule } from '../../keyword/keyword.module';

@Module({
  imports: [KeywordModule],
  providers: [ParsingEngine],
  exports: [ParsingEngine],
})
export class ParsingModule {}
