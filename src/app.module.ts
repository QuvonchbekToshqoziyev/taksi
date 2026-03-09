import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { RedirectModule } from './redirect/redirect.module';
import { PrismaService } from './prisma/prisma.service';
import { AdminModule } from './admin/admin.module';
import { TargetModule } from './target/target.module';
import { KeywordModule } from './keyword/keyword.module';
import { LocationModule } from './location/location.module';
import { AdminLogModule } from './admin-log/admin-log.module';
import { RideOrderModule } from './ride-order/ride-order.module';
import { DriverModule } from './driver/driver.module';
import { DriverPostModule } from './driver-post/driver-post.module';
import { PublicChannelModule } from './public-channel/public-channel.module';

@Module({
  imports: [BotModule, RedirectModule, AdminModule, TargetModule, KeywordModule, LocationModule, AdminLogModule, RideOrderModule, DriverModule, DriverPostModule, PublicChannelModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
