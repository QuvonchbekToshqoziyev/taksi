import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [LocationService, PrismaService],
  exports: [LocationService],
})
export class LocationModule {}
