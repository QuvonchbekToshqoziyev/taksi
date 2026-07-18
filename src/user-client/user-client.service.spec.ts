import { UserClientService } from './user-client.service';

describe('UserClientService', () => {
  describe('keyword matching', () => {
    const createService = () => {
      const bot = { telegram: {} } as any;
      const keywordService = {
        getClientKeywords: () => [],
        getDriverKeywords: () => [],
      };
      const redirectService = {
        getActiveGroups: jest.fn().mockResolvedValue([]),
      };
      const targetService = {
        isTargetGroup: jest.fn().mockResolvedValue(false),
      };

      return new UserClientService(
        bot,
        keywordService as any,
        redirectService as any,
        targetService as any,
        {} as any,
      );
    };

    it('matches client keywords', () => {
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

      const clientMessages = [
        'taksi kerak',
        'taxi kerak',
        'kerak',
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

      for (const text of clientMessages) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('rejects driver keywords', () => {
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

      const driverMessages = [
        'olamiz',
        'odam olamiz',
        'pochta olamiz',
        'yolovchi olamiz',
        'taksi bor',
        'taxi bor',
        'mashina bor',
        'mashina bormi',
        'bosh mashina bor',
        'bosh taksi bor',
        'kim ketadi',
        'kim boradi',
        'оламиз',
        'одам оламиз',
        'почта оламиз',
        'йўловчи оламиз',
        'такси бор',
        'машина бор',
        'машина борми',
        'бош машина бор',
        'бош такси бор',
        'ким кетади',
        'ким боради',
        'obketaman',
        'olib ketaman',
        'obketamiz',
        'bosh moshin',
        'mowina bor',
        'tel +',
        'обкетаман',
        'олиб кетаман',
        'бош мошин',
        'мошина бор',
      ];

      for (const text of driverMessages) {
        expect(isTaxiOrder(text)).toBe(false);
      }
    });

    it('matches combo phrases when both words present', () => {
      // Combo logic: both words must be present in the text
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

      const comboMessages = [
        'taksi kerak hozir', // 'taksi' + 'kerak' both present
        'taxi kerak ertaga', // 'taxi' + 'kerak' both present
        'taksi bormi bugun', // 'taksi' + 'bormi' both present
      ];

      for (const text of comboMessages) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('handles mixed case', () => {
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

      const samples = ['TAKSI KERAK', 'Taxi Kerak', 'Taksi kerak'];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(true);
      }
    });

    it('rejects empty or whitespace-only strings', () => {
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

      const samples = ['', '   ', '\t', '\n'];

      for (const text of samples) {
        expect(isTaxiOrder(text)).toBe(false);
      }
    });

    it('rejects non-order messages', () => {
      const service = createService();
      const isTaxiOrder = (text: string) => (service as any).isTaxiOrder(text);

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
    const createService = () => {
      const bot = { telegram: {} } as any;
      const keywordService = {
        getClientKeywords: () => [],
        getDriverKeywords: () => [],
      };
      const redirectService = {
        getActiveGroups: jest.fn().mockResolvedValue([]),
      };
      const targetService = {
        isTargetGroup: jest.fn().mockResolvedValue(false),
      };

      return new UserClientService(
        bot,
        keywordService as any,
        redirectService as any,
        targetService as any,
        {} as any,
      );
    };

    it('converts text to lowercase', () => {
      const service = createService();
      const normalizeOrderText = (text: string) =>
        (service as any).normalizeOrderText(text);

      expect(normalizeOrderText('TAKSI KERAK')).toBe('taksi kerak');
      expect(normalizeOrderText('Taxi Bormi')).toBe('taxi bormi');
    });

    it('removes apostrophes and quotes', () => {
      const service = createService();
      const normalizeOrderText = (text: string) =>
        (service as any).normalizeOrderText(text);

      expect(normalizeOrderText("yo'lkira")).toBe('yolkira');
      expect(normalizeOrderText('Kamsamoʻldan')).toBe('kamsamoldan');
      expect(normalizeOrderText("Kamsamo'ldan")).toBe('kamsamoldan');
    });

    it('separates numbers from letters', () => {
      const service = createService();
      const normalizeOrderText = (text: string) =>
        (service as any).normalizeOrderText(text);

      expect(normalizeOrderText('1kishi')).toBe('1 kishi');
      expect(normalizeOrderText('2kishimiz')).toBe('2 kishimiz');
      expect(normalizeOrderText('kishi1')).toBe('kishi 1');
    });

    it('handles empty or null input', () => {
      const service = createService();
      const normalizeOrderText = (text: string) =>
        (service as any).normalizeOrderText(text);

      expect(normalizeOrderText('')).toBe('');
      expect(normalizeOrderText(null as any)).toBe('');
      expect(normalizeOrderText(undefined as any)).toBe('');
    });

    it('preserves cyrillic text', () => {
      const service = createService();
      const normalizeOrderText = (text: string) =>
        (service as any).normalizeOrderText(text);

      expect(normalizeOrderText('ТАКСИ КЕРАК')).toBe('такси керак');
      expect(normalizeOrderText('Гулистонга 1 киши')).toBe('гулистонга 1 киши');
    });
  });

  describe('extractPhone', () => {
    const createService = () => {
      const bot = { telegram: {} } as any;
      const keywordService = {
        getClientKeywords: () => [],
        getDriverKeywords: () => [],
      };
      const redirectService = {
        getActiveGroups: jest.fn().mockResolvedValue([]),
      };
      const targetService = {
        isTargetGroup: jest.fn().mockResolvedValue(false),
      };

      return new UserClientService(
        bot,
        keywordService as any,
        redirectService as any,
        targetService as any,
        {} as any,
      );
    };

    it('extracts Uzbek phone numbers', () => {
      const service = createService();
      const extractPhone = (text: string) =>
        (service as any).extractPhone(text);

      expect(extractPhone('+998901234567')).toBe('+998901234567');
      expect(extractPhone('901234567')).toBe('901234567');
      expect(extractPhone('911234567')).toBe('911234567');
      expect(extractPhone('931234567')).toBe('931234567');
      expect(extractPhone('941234567')).toBe('941234567');
      expect(extractPhone('951234567')).toBe('951234567');
      expect(extractPhone('971234567')).toBe('971234567');
      expect(extractPhone('981234567')).toBe('981234567');
      expect(extractPhone('991234567')).toBe('991234567');
    });

    it('extracts phone from message text', () => {
      const service = createService();
      const extractPhone = (text: string) =>
        (service as any).extractPhone(text);

      expect(extractPhone('taksi kerak 901234567')).toBe('901234567');
      expect(extractPhone('telefon: +998901234567')).toBe('+998901234567');
      expect(extractPhone('aloqa 91 123 45 67')).toBeNull();
    });

    it('returns null when no phone found', () => {
      const service = createService();
      const extractPhone = (text: string) =>
        (service as any).extractPhone(text);

      expect(extractPhone('taksi kerak')).toBeNull();
      expect(extractPhone('salom')).toBeNull();
      expect(extractPhone('')).toBeNull();
    });
  });
});
