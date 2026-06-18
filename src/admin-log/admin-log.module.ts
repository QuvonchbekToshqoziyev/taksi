import { Module } from '@nestjs/common';
import { AdminLogService } from './admin-log.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
