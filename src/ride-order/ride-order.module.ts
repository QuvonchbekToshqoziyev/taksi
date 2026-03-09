import { Module } from '@nestjs/common';
import { RideOrderService } from './ride-order.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [RideOrderService, PrismaService],
  exports: [RideOrderService],
})
export class RideOrderModule {}
