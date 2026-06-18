import { Module } from '@nestjs/common';
import { PublicChannelService } from './public-channel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PublicChannelService],
  exports: [PublicChannelService],
})
export class PublicChannelModule {}
