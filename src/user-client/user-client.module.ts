import { Module } from '@nestjs/common';
import { UserClientService } from './user-client.service';
import { KeywordModule } from '../keyword/keyword.module';
import { RedirectModule } from '../redirect/redirect.module';
import { TargetModule } from '../target/target.module';
import { RideOrderModule } from '../ride-order/ride-order.module';
import { BotGatewayModule } from '../bot/bot-gateway.module';

@Module({
  imports: [
    KeywordModule,
    RedirectModule,
    TargetModule,
    RideOrderModule,
    BotGatewayModule,
  ],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}
