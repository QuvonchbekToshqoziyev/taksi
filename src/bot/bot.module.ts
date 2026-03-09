import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { RedirectModule } from '../redirect/redirect.module';
import { AdminModule } from 'src/admin/admin.module';
import { TargetModule } from 'src/target/target.module';
import { KeywordModule } from 'src/keyword/keyword.module';
import { LocationModule } from 'src/location/location.module';
import { AdminLogModule } from 'src/admin-log/admin-log.module';
import { RideOrderModule } from 'src/ride-order/ride-order.module';
import { DriverModule } from 'src/driver/driver.module';
import { DriverPostModule } from 'src/driver-post/driver-post.module';
import { PublicChannelModule } from 'src/public-channel/public-channel.module';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN!,
    }),
    RedirectModule,
    AdminModule,
    TargetModule,
    KeywordModule,
    LocationModule,
    AdminLogModule,
    RideOrderModule,
    DriverModule,
    DriverPostModule,
    PublicChannelModule,
  ],
  providers: [BotUpdate],
})
export class BotModule {}
