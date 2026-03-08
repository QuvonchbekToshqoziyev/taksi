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
    ];

    for (const text of samples) {
      expect(isTaxiOrder(text)).toBe(true);
    }
  });

  it('rejects clear driver-side offers', () => {
    const samples = [
      'odam olamiz',
      'olib ketaman',
      'obketamiz',
      'bosh taksi bor',
      'kim ketadi',
    ];

    for (const text of samples) {
      expect(isTaxiOrder(text)).toBe(false);
    }
  });
});
