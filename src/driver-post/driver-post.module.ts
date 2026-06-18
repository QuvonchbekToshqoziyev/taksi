import { Module } from '@nestjs/common';
import { DriverPostService } from './driver-post.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DriverPostService],
  exports: [DriverPostService],
})
export class DriverPostModule {}
