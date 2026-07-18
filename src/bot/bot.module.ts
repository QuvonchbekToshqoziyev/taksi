import { Module } from '@nestjs/common';
import { RedirectModule } from '../redirect/redirect.module';
import { AdminModule } from '../admin/admin.module';
import { TargetModule } from '../target/target.module';
import { KeywordModule } from '../keyword/keyword.module';
import { LocationModule } from '../location/location.module';
import { AdminLogModule } from '../admin-log/admin-log.module';
import { RideOrderModule } from '../ride-order/ride-order.module';
import { DriverModule } from '../driver/driver.module';
import { DriverPostModule } from '../driver-post/driver-post.module';
import { PublicChannelModule } from '../public-channel/public-channel.module';
import { CoreModule } from '../core/core.module';
import { DriverBotService } from './services/driver-bot.service';
import { ClientBotService } from './services/client-bot.service';
import { AdminBotService } from './services/admin-bot.service';
import { BotGatewayModule } from './bot-gateway.module';
import { BotRuntime } from './bot.runtime';
import { BotUpdate } from './bot.update';
import { AdminBotUpdate } from './admin/admin-bot.update';
import { ClientBotUpdate } from './client/client-bot.update';
import { DriverBotUpdate } from './driver/driver-bot.update';

@Module({
  imports: [
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
    CoreModule,
    BotGatewayModule,
  ],
  providers: [
    BotRuntime,
    BotUpdate,
    AdminBotUpdate,
    ClientBotUpdate,
    DriverBotUpdate,
    DriverBotService,
    ClientBotService,
    AdminBotService,
  ],
  exports: [BotRuntime],
})
export class BotModule {}
