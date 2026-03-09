import { Module } from '@nestjs/common';
import { PublicChannelService } from './public-channel.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [PublicChannelService, PrismaService],
  exports: [PublicChannelService],
})
export class PublicChannelModule {}
