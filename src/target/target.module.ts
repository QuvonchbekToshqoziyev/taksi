import { Module } from '@nestjs/common';
import { TargetService } from './target.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    providers: [TargetService, PrismaService],
    exports: [TargetService],
})
export class TargetModule {}
