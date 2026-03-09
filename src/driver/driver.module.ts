import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [DriverService, PrismaService],
  exports: [DriverService],
})
export class DriverModule {}
