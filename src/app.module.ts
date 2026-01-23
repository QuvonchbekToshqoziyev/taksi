import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { RedirectModule } from './redirect/redirect.module';
import { PrismaService } from './prisma/prisma.service';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [BotModule, RedirectModule, AdminModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
