import { Injectable } from '@nestjs/common';
import { Context, Telegraf, Telegram } from 'telegraf';

type BotRole = 'admin' | 'client' | 'driver';

@Injectable()
export class BotGateway {
  private botInstances: Partial<Record<BotRole, Telegraf<Context>>> = {};
  private primaryRole: BotRole | null = null;

  setBot(role: BotRole, bot: Telegraf<Context>) {
    this.botInstances[role] = bot;
    if (!this.primaryRole || role === 'admin') {
      this.primaryRole = role;
    }
  }

  getBot(role?: BotRole): Telegraf<Context> {
    const selected = role || this.primaryRole || 'admin';
    const bot = this.botInstances[selected];

    if (!bot) {
      throw new Error('Bot is not initialized yet');
    }
    return bot;
  }

  getTelegram(role?: BotRole): Telegram {
    return this.getBot(role).telegram;
  }
}
