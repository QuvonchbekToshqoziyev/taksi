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
});
