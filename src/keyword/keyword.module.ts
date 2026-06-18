import { Module } from '@nestjs/common';
import { KeywordService } from './keyword.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [KeywordService],
    exports: [KeywordService],
})
export class KeywordModule {}
