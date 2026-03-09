import { Module } from '@nestjs/common';
import { DriverPostService } from './driver-post.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [DriverPostService, PrismaService],
  exports: [DriverPostService],
})
export class DriverPostModule {}
