import { Module } from '@nestjs/common';
import { AdminLogService } from './admin-log.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [AdminLogService, PrismaService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
