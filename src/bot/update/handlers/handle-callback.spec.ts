import { handleCallback } from './handle-callback';

describe('handleCallback', () => {
  it('ignores duplicate callback actions when lock is not acquired', async () => {
    const answers: string[] = [];
    const ctx: any = {
      callbackQuery: {
        id: 'cb-1',
        data: 'rm_redirect:-1001',
        from: { id: 7 },
      },
      answerCbQuery: (text: string) => {
        answers.push(text);
        return Promise.resolve();
      },
    };

    const self: any = {
      tryAcquireActionLock: () => false,
      tgSafe: (fn: () => Promise<unknown>) => fn(),
    };

    await handleCallback(self, ctx);

    expect(answers[0]).toContain('allaqachon');
  });

  it('does not broadcast a ride when database persistence fails', async () => {
    const ctx: any = {
      callbackQuery: {
        id: 'cb-2',
        data: 'ride_confirm',
        from: { id: 7 },
      },
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(undefined),
    };
    const sendRideOrder = jest.fn();
    const self: any = {
      tryAcquireActionLock: () => true,
      isRateLimited: () => false,
      isAdminAudience: () => true,
      isClientAudience: () => true,
      isDriverAudience: () => true,
      tgSafe: (fn: () => Promise<unknown>) => fn(),
      rideState: new Map([
        [
          7,
          {
            step: 'confirm',
            fromName: 'A',
            toName: 'B',
            count: 1,
            phone: '901234567',
          },
        ],
      ]),
      rideOrderService: {
        create: jest.fn().mockRejectedValue(new Error('database unavailable')),
      },
      logEvent: jest.fn(),
      getErrDesc: (error: Error) => error.message,
      sendRideOrder,
    };

    await handleCallback(self, ctx);

    expect(sendRideOrder).not.toHaveBeenCalled();
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('saqlanmadi'),
    );
    expect(self.rideState.has(7)).toBe(true);
  });
});
