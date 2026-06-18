import { handleAdminText } from './handle-admin-text';

describe('handleAdminText', () => {
  it('returns validation error for invalid keyword input', async () => {
    const replies: string[] = [];
    const ctx: any = {
      from: { id: 10 },
      reply: (text: string) => {
        replies.push(text);
        return Promise.resolve();
      },
    };

    const self: any = {
      waitingKeyword: new Map<number, 'client' | 'driver'>([[10, 'client']]),
      tgSafe: (fn: () => Promise<unknown>) => fn(),
    };

    const handled = await handleAdminText(self, ctx, '!', true);

    expect(handled).toBe(true);
    expect(replies[0]).toContain('Kalit so\'z');
  });
});
