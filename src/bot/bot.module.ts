import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { RedirectModule } from '../redirect/redirect.module';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN!,
    }),
    RedirectModule,AdminModule,RedirectModule
  ],
  providers: [BotUpdate],
})
export class BotModule { }
