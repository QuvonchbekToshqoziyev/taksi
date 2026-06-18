import { Module } from '@nestjs/common';
import { RideOrderService } from './ride-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StateModule } from '../core/state/state.module';

@Module({
  imports: [PrismaModule, StateModule],
  providers: [RideOrderService],
  exports: [RideOrderService],
})
export class RideOrderModule {}
