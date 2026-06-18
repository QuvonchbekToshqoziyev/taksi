import { Module } from '@nestjs/common';
import { TargetService } from './target.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [TargetService],
    exports: [TargetService],
})
export class TargetModule {}
