import { Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { BotGateway } from './bot.gateway';
import { AdminBotUpdate } from './admin/admin-bot.update';
import { ClientBotUpdate } from './client/client-bot.update';
import { DriverBotUpdate } from './driver/driver-bot.update';
import { BotUpdate } from './bot.update';
import type { SafeContext } from './update/bot-update.types';

type BotRole = 'admin' | 'client' | 'driver';

export async function waitForBotLaunch(
  bot: Telegraf<Context>,
  onPollingError: (error: unknown) => void,
) {
  await new Promise<void>((resolve, reject) => {
    let connected = false;
    void bot
      .launch({}, () => {
        connected = true;
        resolve();
      })
      .catch((error: unknown) => {
        if (connected) {
          onPollingError(error);
          return;
        }
        reject(error);
      });
  });
}

@Injectable()
export class BotRuntime {
  private readonly logger = new Logger(BotRuntime.name);
  private bots = new Map<BotRole, Telegraf<Context>>();

  constructor(
    private readonly botGateway: BotGateway,
    private readonly adminBotUpdate: AdminBotUpdate,
    private readonly clientBotUpdate: ClientBotUpdate,
    private readonly driverBotUpdate: DriverBotUpdate,
    private readonly combinedBotUpdate: BotUpdate,
  ) {}

  async start() {
    const legacyToken = process.env.BOT_TOKEN;
    const dedicatedTokensConfigured = Boolean(
      process.env.ADMIN_BOT_TOKEN ||
      process.env.CLIENT_BOT_TOKEN ||
      process.env.DRIVER_BOT_TOKEN,
    );

    if (legacyToken && !dedicatedTokensConfigured) {
      await this.startBot('admin', legacyToken, this.combinedBotUpdate);
      if (!this.bots.size) {
        throw new Error('The BOT_TOKEN bot could not be started.');
      }
      this.logger.log('Telegraf bot runtime started in combined mode');
      return;
    }

    const adminToken = process.env.ADMIN_BOT_TOKEN || legacyToken;
    const clientToken = process.env.CLIENT_BOT_TOKEN;
    const driverToken = process.env.DRIVER_BOT_TOKEN;

    if (!adminToken && !clientToken && !driverToken) {
      throw new Error(
        'No bot tokens found. Set ADMIN_BOT_TOKEN, CLIENT_BOT_TOKEN, DRIVER_BOT_TOKEN.',
      );
    }

    const tokenRoles = new Map<string, string[]>();
    for (const [role, token] of [
      ['admin', adminToken],
      ['client', clientToken],
      ['driver', driverToken],
    ] as const) {
      if (!token) continue;
      const roles = tokenRoles.get(token) || [];
      roles.push(role);
      tokenRoles.set(token, roles);
    }

    const allowedRoles = new Set<BotRole>(['admin', 'client', 'driver']);
    for (const roles of tokenRoles.values()) {
      if (roles.length <= 1) continue;
      const [first, ...duplicates] = roles as BotRole[];
      for (const role of duplicates) {
        allowedRoles.delete(role);
      }
      this.logger.error(
        `Duplicate token for roles [${roles.join(', ')}]. Keeping ${first}, disabling ${duplicates.join(', ')}.`,
      );
    }

    const jobs: Array<Promise<void>> = [];
    if (allowedRoles.has('admin')) {
      jobs.push(this.startBot('admin', adminToken, this.adminBotUpdate));
    }
    if (allowedRoles.has('client')) {
      jobs.push(this.startBot('client', clientToken, this.clientBotUpdate));
    }
    if (allowedRoles.has('driver')) {
      jobs.push(this.startBot('driver', driverToken, this.driverBotUpdate));
    }

    await Promise.allSettled(jobs);

    if (!this.bots.size) {
      throw new Error(
        'No bot could be started. Check bot tokens and network access.',
      );
    }

    this.logger.log(
      `Telegraf bot runtime started: ${Array.from(this.bots.keys()).join(', ')}`,
    );
  }

  private async startBot(
    role: BotRole,
    token: string | undefined,
    update: {
      start(ctx: SafeContext): Promise<unknown>;
      admin(ctx: SafeContext): Promise<unknown>;
      getId(ctx: Context): Promise<unknown>;
      onText(ctx: SafeContext): Promise<unknown>;
      onContact(ctx: SafeContext): Promise<unknown>;
      onPhoto(ctx: SafeContext): Promise<unknown>;
      onCallback(ctx: Context): Promise<unknown>;
    },
  ) {
    if (!token) {
      this.logger.warn(
        `${role.toUpperCase()}_BOT_TOKEN is not set; ${role} bot is disabled.`,
      );
      return;
    }

    const bot = new Telegraf<Context>(token);
    bot.catch((err) => {
      this.logger.error(`${role} bot update handler error: ${String(err)}`);
    });

    bot.start((ctx) => update.start(ctx as SafeContext));
    bot.command('admin', (ctx) => update.admin(ctx as SafeContext));
    bot.command('getid', (ctx) => update.getId(ctx));
    bot.on('text', (ctx) => update.onText(ctx as SafeContext));
    bot.on('contact', (ctx) => update.onContact(ctx as SafeContext));
    bot.on('photo', (ctx) => update.onPhoto(ctx as SafeContext));
    bot.on('callback_query', (ctx) => update.onCallback(ctx));

    try {
      await waitForBotLaunch(bot, (error) => {
        this.logger.error(`${role} bot polling stopped: ${String(error)}`);
      });
      this.bots.set(role, bot);
      this.botGateway.setBot(role, bot);
      this.logger.log(`${role} bot started`);
    } catch (error) {
      this.logger.error(`${role} bot failed to start: ${String(error)}`);
    }
  }

  stop() {
    for (const [role, bot] of this.bots.entries()) {
      bot.stop();
      this.logger.log(`${role} bot stopped`);
    }
    this.bots.clear();
    this.logger.log('Telegraf bot runtime stopped');
  }

  getStatus(): Record<BotRole, boolean> {
    return {
      admin: this.bots.has('admin'),
      client: this.bots.has('client'),
      driver: this.bots.has('driver'),
    };
  }
}
