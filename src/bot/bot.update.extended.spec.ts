import { BotUpdate } from './bot.update';

describe('BotUpdate', () => {
  const createBotUpdate = (overrides = {}) => {
    const redirectService = { getActiveGroups: jest.fn().mockResolvedValue([]) };
    const adminService = {
      isSuperAdmin: jest.fn().mockResolvedValue(false),
      isAdmin: jest.fn().mockResolvedValue(false),
    };
    const targetService = { isTargetGroup: jest.fn().mockResolvedValue(false) };
    const keywordService = { getClientKeywords: () => [], getDriverKeywords: () => [] };
    const locationService = { getLocations: jest.fn().mockResolvedValue([]) };
    const adminLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const rideOrderService = { create: jest.fn().mockResolvedValue(undefined) };
    const driverService = { register: jest.fn().mockResolvedValue(undefined) };
    const driverPostService = { create: jest.fn().mockResolvedValue(undefined) };
    const publicChannelService = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const userClientService = { sendMessageToGroup: jest.fn().mockResolvedValue(undefined) };

    return new BotUpdate(
      redirectService as any,
      adminService as any,
      targetService as any,
      keywordService as any,
      locationService as any,
      adminLogService as any,
      rideOrderService as any,
      driverService as any,
      driverPostService as any,
      publicChannelService as any,
      userClientService as any,
    );
  };

  describe('isTaxiOrder', () => {
    const bot = createBotUpdate();
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
        'Kamsamoʻldan gulistonga 2kishimiz',
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

    it('accepts generic client phrases', () => {
      const samples = [
        'taksi kerak',
        'taxi kerak',
        'kerak',
        'kere',
        'kk',
        'zakaz',
        'zakaz bor',
        'odam bor',
        'kishi bor',
        'pochta bor',
        'srochni',
        'bormi',
        'boraman',
        'boramiz',
        'taksi bormi',
        'taxi bormi',
        'srochna',
        'dastavka bor',
        'dostavka bor',
        'bir kishi',
        'bir odam',
        '1 kishi',
        '1kishi',
        '2kishi',
        'kishimiz',
        'hozirga',
        'xozirga',
        'такси керак',
        'такси кере',
        'керак',
        'кк',
        'заказ',
        'заказ бор',
        'одам бор',
        'киши бор',
        'срочни',
        'срочна',
        'хозирга',
      ];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('accepts combo phrases when both words present', () => {
      // Combo logic: both words must be present in the text
      // These are already covered by CLIENT_WORDS_SINGLE, but this verifies
      // the combo fallback works for variations
      const samples = [
        'taksi kerak hozir',  // 'taksi' + 'kerak' both present
        'taxi kerak ertaga',  // 'taxi' + 'kerak' both present
        'taksi bormi bugun',  // 'taksi' + 'bormi' both present
      ];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('handles mixed case', () => {
      const samples = [
        'TAKSI KERAK',
        'Taxi Kerak',
        'Taksi kerak',
      ];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('rejects empty or whitespace-only strings', () => {
      const samples = ['', '   ', '\t', '\n'];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(false);
      }
    });

    it('rejects non-order messages', () => {
      const samples = [
        'salom',
        'qanday ahvol',
        'yaxshimisiz',
        'rahmat',
        'ha',
        'yoq',
        '123',
        'test',
      ];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(false);
      }
    });
  });

  describe('normalizeOrderText', () => {
    const bot = createBotUpdate();
    const normalizeOrderText = (text: string) => (bot as any).normalizeOrderText(text);

    it('converts text to lowercase', () => {
      expect(normalizeOrderText('TAKSI KERAK')).toBe('taksi kerak');
      expect(normalizeOrderText('Taxi Bormi')).toBe('taxi bormi');
    });

    it('removes apostrophes and quotes', () => {
      expect(normalizeOrderText("yo'lkira")).toBe('yolkira');
      expect(normalizeOrderText('Kamsamoʻldan')).toBe('kamsamoldan');
      expect(normalizeOrderText("Kamsamo'ldan")).toBe('kamsamoldan');
    });

    it('separates numbers from letters', () => {
      expect(normalizeOrderText('1kishi')).toBe('1 kishi');
      expect(normalizeOrderText('2kishimiz')).toBe('2 kishimiz');
      expect(normalizeOrderText('kishi1')).toBe('kishi 1');
    });

    it('handles empty or null input', () => {
      expect(normalizeOrderText('')).toBe('');
      expect(normalizeOrderText(null as any)).toBe('');
      expect(normalizeOrderText(undefined as any)).toBe('');
    });

    it('preserves cyrillic text', () => {
      expect(normalizeOrderText('ТАКСИ КЕРАК')).toBe('такси керак');
      expect(normalizeOrderText('Гулистонга 1 киши')).toBe('гулистонга 1 киши');
    });
  });

  describe('rate limiting', () => {
    it('allows requests within limit', () => {
      const bot = createBotUpdate();
      const isRateLimited = (userId: number) => (bot as any).isRateLimited(userId);

      // First 5 requests should not be rate limited
      for (let i = 0; i < 5; i++) {
        expect(isRateLimited(123)).toBe(false);
      }
    });

    it('blocks requests after limit', () => {
      const bot = createBotUpdate();
      const isRateLimited = (userId: number) => (bot as any).isRateLimited(userId);

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        isRateLimited(123);
      }

      // 6th request should be rate limited
      expect(isRateLimited(123)).toBe(true);
    });

    it('tracks rate limits per user', () => {
      const bot = createBotUpdate();
      const isRateLimited = (userId: number) => (bot as any).isRateLimited(userId);

      // User 123 exhausts limit
      for (let i = 0; i < 5; i++) {
        isRateLimited(123);
      }

      // User 123 is limited
      expect(isRateLimited(123)).toBe(true);

      // User 456 is not limited
      expect(isRateLimited(456)).toBe(false);
    });
  });

  describe('onText - private chat handling', () => {
    it('does not forward non-orders in private chat', async () => {
      const bot = createBotUpdate();

      const ctx = {
        chat: { id: 1001, type: 'private' as const },
        from: { id: 9001, first_name: 'User' },
        message: { text: 'taxi bor', message_id: 77 },
        telegram: {},
        reply: jest.fn(),
      } as any;

      const scoutSpy = jest.spyOn(bot as any, 'handleTargetGroupMessage').mockResolvedValue(undefined);

      await bot.onText(ctx);

      expect(scoutSpy).not.toHaveBeenCalled();
    });

    it('handles rate limited users in private chat', async () => {
      const bot = createBotUpdate();

      const ctx = {
        chat: { id: 1001, type: 'private' as const },
        from: { id: 9001, first_name: 'User' },
        message: { text: 'test', message_id: 77 },
        telegram: {},
        reply: jest.fn(),
      } as any;

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        (bot as any).isRateLimited(9001);
      }

      await bot.onText(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('⚠️ Iltimos, sekinroq yozing.');
    });
  });
});
