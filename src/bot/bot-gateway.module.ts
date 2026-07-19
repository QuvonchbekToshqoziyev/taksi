import { Global, Module } from '@nestjs/common';
import { BotGateway } from './bot.gateway';

@Global()
@Module({
  providers: [BotGateway],
  exports: [BotGateway],
})
export class BotGatewayModule {}
