import { BotUpdate } from '../bot.update';

describe('driver advertisement lifecycle', () => {
  const createBot = (driverPostService: any, publicChannelService: any) =>
    new BotUpdate(
      {} as any,
      {} as any,
      {} as any,
      { getClientKeywords: () => [], getDriverKeywords: () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      driverPostService,
      publicChannelService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

  it('keeps a successfully published ad active and records its Telegram message', async () => {
    const driverPostService = {
      recordMessage: jest.fn().mockResolvedValue(undefined),
      closePost: jest.fn().mockResolvedValue(undefined),
    };
    const bot = createBot(driverPostService, {
      getActiveChannels: jest
        .fn()
        .mockResolvedValue([{ chatId: '-1008', title: 'Ads' }]),
    });
    const ctx = {
      from: { id: 9, username: 'driver' },
      telegram: {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 44 }),
      },
    };

    const sent = await (bot as any).sendDriverPostToChannels(
      ctx,
      { fullName: 'Driver', phone: '901234567', carNumber: '01A123BC' },
      { id: 3, fromName: 'A', toName: 'B', seats: 2 },
    );

    expect(sent).toBe(1);
    expect(driverPostService.recordMessage).toHaveBeenCalledWith(
      3,
      '-1008',
      44,
    );
    expect(driverPostService.closePost).not.toHaveBeenCalled();
  });

  it('removes published Telegram messages when the driver closes the ad', async () => {
    const driverPostService = {
      closePost: jest.fn().mockResolvedValue(undefined),
    };
    const bot = createBot(driverPostService, {});
    const deleteMessage = jest.fn().mockResolvedValue(true);
    const ctx = { telegram: { deleteMessage } };

    await (bot as any).closeDriverPost(ctx, {
      id: 3,
      messages: [{ chatId: '-1008', messageId: 44 }],
    });

    expect(driverPostService.closePost).toHaveBeenCalledWith(3);
    expect(deleteMessage).toHaveBeenCalledWith('-1008', 44);
  });
});
