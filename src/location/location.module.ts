import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
