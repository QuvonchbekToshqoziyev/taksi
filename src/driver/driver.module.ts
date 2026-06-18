import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StateModule } from '../core/state/state.module';

@Module({
  imports: [PrismaModule, StateModule],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
