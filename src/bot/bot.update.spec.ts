import { BotUpdate } from './bot.update';

describe('BotUpdate isTaxiOrder', () => {
  const bot = new BotUpdate({} as any, {} as any);
  const isTaxiOrder = (text: string) => (bot as any).isTaxiOrder(text);

  it('accepts extended client phrases from real chats', () => {
    const samples = [
      'лелндан камсамулга почта бор 902424545',
      'Kamsamoldan gulistonga 1kishi bor',
      'Gulistondan toshkenga zakazga moshina kk',
      'Toshkentdan kamsamolga taksi kk',
      'Gulistondan kamsamolga 1 kiwi bor',
      'Гулистонга 1киши бор',
      "Assalomu alaykum 3 mavzega dastavka bor yo'lkira 15 ming",
      'Gulistonga 1 ta odam bor',
      'Kamsamolda. Gulistonga bir kishi bor',
      'Assalomu aleykum,kamsamoldan toshkentga 2 kishi soat 7:30 ga',
      'Гулистонга 1 кши срочна',
      'Шахарга бир киши',
      'Toshkentdan Kamsamolga taksi bormi hozrga?',
      'Гулистондан камсамолга 1киши бор',
      'тошкендан камсамолга такси борми',
      'Гулистонга Бир киши',
      'Gulistondan kamsamolga taxi bormi srochna zakazga 40 ming beraman',
      'Kamsamo‘ldan gulistonga 2kishimiz',
      'Waxarga dastavka bor',
      'Gulistondan kamsamolga 1 kishi',
      'kamsamoldan gulistonga bormi',
      'kamsamoldan gulistonga boraman',
    ];

    for (const text of samples) {
      expect(isTaxiOrder(text)).toBe(true);
    }
  });

  it('rejects clear driver-side offers', () => {
    const samples = [
      'taxi bor',
      'odam olamiz',
      'olib ketaman',
      'obketamiz',
      'bosh taksi bor',
      'kim ketadi',
      'kamsamoldan gulistonga',
    ];

    for (const text of samples) {
      expect(isTaxiOrder(text)).toBe(false);
    }
  });

  it('does not forward non-orders in private chat', async () => {
    const redirectService = { getActiveGroups: jest.fn().mockResolvedValue([]) };
    const adminService = { isAdmin: jest.fn().mockResolvedValue(false) };
    const localBot = new BotUpdate(redirectService as any, adminService as any);

    const ctx = {
      chat: { id: 1001, type: 'private' as const },
      from: { id: 9001, first_name: 'User' },
      message: { text: 'taxi bor', message_id: 77 },
      telegram: {},
      reply: jest.fn(),
    } as any;

    jest.spyOn(localBot as any, 'handlePendingPhoneReply').mockResolvedValue(false);

    const forwardSpy = jest.spyOn(localBot as any, 'forwardAll').mockResolvedValue(undefined);
    const withoutPhoneSpy = jest
      .spyOn(localBot as any, 'forwardOrderWithoutPhone')
      .mockResolvedValue(undefined);
    const askPhoneSpy = jest.spyOn(localBot as any, 'askPhoneAndStore').mockResolvedValue(undefined);

    await localBot.onText(ctx);

    expect(forwardSpy).not.toHaveBeenCalled();
    expect(withoutPhoneSpy).not.toHaveBeenCalled();
    expect(askPhoneSpy).not.toHaveBeenCalled();
  });
});
