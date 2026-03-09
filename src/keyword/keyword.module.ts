import { Module } from '@nestjs/common';
import { KeywordService } from './keyword.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    providers: [KeywordService, PrismaService],
    exports: [KeywordService],
})
export class KeywordModule {}
