import { Context, Telegraf } from 'telegraf';
import { waitForBotLaunch } from './bot.runtime';

describe('waitForBotLaunch', () => {
  it('resolves when Telegraf connects without waiting for polling to end', async () => {
    const launch = jest.fn(
      (_config: object, onLaunch?: () => void) => {
        onLaunch?.();
        return new Promise<void>(() => undefined);
      },
    );
    const bot = { launch } as unknown as Telegraf<Context>;

    await expect(waitForBotLaunch(bot, jest.fn())).resolves.toBeUndefined();
  });

  it('rejects when Telegraf cannot connect', async () => {
    const error = new Error('invalid token');
    const bot = {
      launch: jest.fn().mockRejectedValue(error),
    } as unknown as Telegraf<Context>;

    await expect(waitForBotLaunch(bot, jest.fn())).rejects.toBe(error);
  });
});
