import { ScoringEngine } from './scoring.engine';
import { ParsedRequest } from '../parsing/parsing.types';

describe('ScoringEngine', () => {
  let engine: ScoringEngine;

  beforeEach(() => {
    engine = new ScoringEngine();
  });

  describe('score', () => {
    it('should score a complete client request as valid', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        time: 'hozir',
        seats: 2,
        phone: '901234567',
        fromLocation: 'Uy',
        toLocation: 'Ish',
        rawTokens: [],
        confidence: 8,
      };

      const result = engine.score(parsed);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should score an incomplete request as invalid', () => {
      const parsed: ParsedRequest = {
        intent: 'unknown',
        rawTokens: [],
        confidence: 2,
      };

      const result = engine.score(parsed);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
    });

    it('should give points for time', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        time: 'hozir',
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const timeBreakdown = result.breakdown.find(b => b.category === 'TIME');

      expect(timeBreakdown).toBeDefined();
      expect(timeBreakdown!.points).toBeGreaterThan(0);
    });

    it('should give points for seats', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        seats: 2,
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const seatsBreakdown = result.breakdown.find(b => b.category === 'SEATS');

      expect(seatsBreakdown).toBeDefined();
      expect(seatsBreakdown!.points).toBeGreaterThan(0);
    });

    it('should give points for valid phone', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        phone: '901234567',
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const phoneBreakdown = result.breakdown.find(b => b.category === 'PHONE');

      expect(phoneBreakdown).toBeDefined();
      expect(phoneBreakdown!.points).toBeGreaterThan(0);
    });

    it('should give points for intent', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const intentBreakdown = result.breakdown.find(b => b.category === 'INTENT');

      expect(intentBreakdown).toBeDefined();
      expect(intentBreakdown!.points).toBeGreaterThan(0);
    });

    it('should give points for locations', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        fromLocation: 'Uy',
        toLocation: 'Ish',
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const locationBreakdown = result.breakdown.find(b => b.category === 'LOCATION');

      expect(locationBreakdown).toBeDefined();
      expect(locationBreakdown!.points).toBeGreaterThan(0);
    });

    it('should give confidence bonus for high confidence', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        rawTokens: [],
        confidence: 8,
      };

      const result = engine.score(parsed);
      const confidenceBonus = result.breakdown.find(b => b.category === 'CONFIDENCE_BONUS');

      expect(confidenceBonus).toBeDefined();
      expect(confidenceBonus!.points).toBe(1);
    });

    it('should not give confidence bonus for low confidence', () => {
      const parsed: ParsedRequest = {
        intent: 'client',
        rawTokens: [],
        confidence: 5,
      };

      const result = engine.score(parsed);
      const confidenceBonus = result.breakdown.find(b => b.category === 'CONFIDENCE_BONUS');

      expect(confidenceBonus).toBeUndefined();
    });
  });
});
