import { ParsingEngine } from './parsing.engine';
import { TokenCategory } from './parsing.types';

describe('ParsingEngine', () => {
  let engine: ParsingEngine;

  beforeEach(() => {
    const mockKeywordService = {
      getClientKeywords: () => [],
      getDriverKeywords: () => [],
    };
    engine = new ParsingEngine(mockKeywordService as any);
  });

  describe('parse', () => {
    it('should parse client request with all fields', () => {
      const text = 'taksi kerak hozir 2 kishi 901234567';
      const result = engine.parse(text);

      expect(result.intent).toBe('client');
      expect(result.seats).toBe(2);
      expect(result.time).toBe('hozir');
      expect(result.phone).toBe('901234567');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should parse driver offer', () => {
      const text = 'taksi bor olamiz';
      const result = engine.parse(text);

      expect(result.intent).toBe('driver');
    });

    it('should handle cyrillic text', () => {
      const text = 'такси керак hozir 2 kishi';
      const result = engine.parse(text);

      expect(result.intent).toBe('client');
      expect(result.seats).toBe(2);
    });

    it('should normalize text properly', () => {
      const text = "yo'lkira 1kishi";
      const result = engine.parse(text);

      expect(result.rawTokens.length).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const result = engine.parse('');

      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should extract phone numbers correctly', () => {
      const text = 'taksi kerak +998901234567';
      const result = engine.parse(text);

      expect(result.phone).toBe('+998901234567');
    });

    it('should extract seats from uzbek numbers', () => {
      const text = 'taksi kerak bir kishi';
      const result = engine.parse(text);

      expect(result.seats).toBe(1);
    });

    it('should detect time keywords', () => {
      const urgentTexts = [
        'taksi kerak hozir',
        'taksi kerak xozir',
        'taksi kerak hozirga',
        'taksi kerak xozirga',
      ];

      for (const text of urgentTexts) {
        const result = engine.parse(text);
        expect(result.time).toBeDefined();
      }
    });
  });

  describe('normalize', () => {
    it('should convert to lowercase', () => {
      const result = engine.parse('TAKSI KERAK');
      expect(result.rawTokens.some(t => t.value === 'taksi')).toBe(true);
    });

    it('should remove apostrophes', () => {
      const result = engine.parse("yo'lkira");
      expect(result.rawTokens.some(t => t.value === 'yolkira')).toBe(true);
    });

    it('should separate numbers from letters', () => {
      const result = engine.parse('1kishi');
      expect(result.rawTokens.some(t => t.value === '1')).toBe(true);
      expect(result.rawTokens.some(t => t.value === 'kishi')).toBe(true);
    });
  });
});
