export function normalizeOrderText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, '')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/[.,!?;:()[\]{}"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasPhrase(text: string, phrase: string): boolean {
  const p = normalizeOrderText(phrase);
  if (!p) return false;
  const body = escapeRegex(p).replace(/\s+/g, '\\s+');
  const re = new RegExp(`(^|\\s)${body}(?=\\s|$)`, 'u');
  return re.test(text);
}

function hasAnyPhrase(text: string, phrases: string[]): boolean {
  for (const phrase of phrases) {
    if (hasPhrase(text, phrase)) return true;
  }
  return false;
}

export const DRIVER_WORDS: string[] = [
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

export const CLIENT_WORDS_SINGLE: string[] = [
  'taksi kerak',
  'taxi kerak',
  'taksi kere',
  'taxi kere',
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
  'mashina bormi',
  'moshina bormi',
  'srochna',
  'dastavka bor',
  'dostavka bor',
  'bir kishi',
  'bir odam',
  '1 kishi',
  '1kishi',
  '2kishi',
  'kishimiz',
  'kshi bor',
  'kiwi bor',
  'yolkira',
  'hozirga',
  'xozirga',
  'такси керак',
  'такси кере',
  'такси борми',
  'керак',
  'кк',
  'заказ',
  'заказ бор',
  'одам бор',
  'киши бор',
  'почта bor',
  'срочни',
  'срочна',
  'хозирга',
  'почта бор',
  'бир киши',
  'киши',
  'кши',
  'kishi',
  'одам',
  'керак',
  'хозирга',
  'hozrga',
];

export const CLIENT_WORDS_COMBO: string[][] = [
  ['taksi', 'kerak'],
  ['taxi', 'kerak'],
  ['заказ', 'бор'],
  ['taksi', 'bormi'],
  ['taxi', 'bormi'],
  ['mashina', 'bormi'],
];

export function isTaxiOrderText(input: {
  text: string;
  driverKeywords: string[];
  clientKeywords: string[];
  forceClientPhrases?: string[];
}): boolean {
  const t = normalizeOrderText(input.text);
  if (!t) return false;

  if (hasAnyPhrase(t, DRIVER_WORDS)) return false;
  if (hasAnyPhrase(t, input.driverKeywords)) return false;

  const forceClientPhrases = input.forceClientPhrases || [];
  if (hasAnyPhrase(t, forceClientPhrases)) return true;

  if (hasAnyPhrase(t, CLIENT_WORDS_SINGLE)) return true;
  if (hasAnyPhrase(t, input.clientKeywords)) return true;

  for (const pattern of CLIENT_WORDS_COMBO) {
    if (pattern.every((p) => hasPhrase(t, p))) return true;
  }

  return false;
}

export function extractUzPhone(text: string): string | null {
  const m = (text || '').match(
    /(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/,
  );
  return m?.[0] || null;
}
