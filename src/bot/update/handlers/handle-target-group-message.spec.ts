import { handleTargetGroupMessage } from './handle-target-group-message';

describe('handleTargetGroupMessage', () => {
  const ctx: any = {
    from: { id: 77, first_name: 'Client' },
    chat: { id: -10055, title: 'Mixed taxi chat' },
    message: { message_id: 12 },
  };

  it('persists the source message before notifying priority drivers', async () => {
    const self: any = {
      isTaxiOrder: () => true,
      parsingEngine: { parse: () => ({ seats: 2, time: 'hozir' }) },
      extractPhone: () => '901234567',
      rideOrderService: {
        createFromGroup: jest.fn().mockResolvedValue({
          created: true,
          order: { id: 31 },
        }),
      },
      redirectService: {
        getActiveGroups: jest
          .fn()
          .mockResolvedValue([{ chatId: '-10099', title: 'Priority' }]),
      },
      buildScoutMessage: jest.fn().mockResolvedValue('Zakaz #31'),
      safeSendMessage: jest.fn().mockResolvedValue({ message_id: 8 }),
      tgDelay: jest.fn(),
      logEvent: jest.fn(),
      isWriteForbidden: () => false,
      getErrDesc: () => '',
    };

    await handleTargetGroupMessage(self, ctx, 'Gulistonga 2 kishi taksi kerak');

    expect(self.rideOrderService.createFromGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceChatId: '-10055',
        sourceMessageId: 12,
        passengers: 2,
      }),
    );
    expect(self.safeSendMessage).toHaveBeenCalledWith(
      ctx,
      '-10099',
      'Zakaz #31',
      { parse_mode: 'HTML' },
    );
  });

  it('does not notify twice when bot and userbot see the same message', async () => {
    const redirectService = { getActiveGroups: jest.fn() };
    const self: any = {
      isTaxiOrder: () => true,
      parsingEngine: { parse: () => ({}) },
      extractPhone: () => null,
      rideOrderService: {
        createFromGroup: jest.fn().mockResolvedValue({
          created: false,
          order: { id: 31 },
        }),
      },
      redirectService,
    };

    await handleTargetGroupMessage(self, ctx, 'taksi kerak');

    expect(redirectService.getActiveGroups).not.toHaveBeenCalled();
  });
});
