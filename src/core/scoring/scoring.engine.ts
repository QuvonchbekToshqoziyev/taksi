import { Injectable, Logger } from '@nestjs/common';
import { ParsedRequest } from '../parsing/parsing.types';
import { ScoringResult, ScoringBreakdown, SCORING_THRESHOLD } from './scoring.types';

@Injectable()
export class ScoringEngine {
  private readonly logger = new Logger(ScoringEngine.name);

  /**
   * Score a parsed request to determine if it's a valid taxi order
   */
  score(parsed: ParsedRequest): ScoringResult {
    const breakdown: ScoringBreakdown[] = [];
    let totalScore = 0;

    // Time proximity scoring
    if (parsed.time) {
      const timeScore = this.scoreTime(parsed.time);
      breakdown.push(timeScore);
      totalScore += timeScore.points;
    }

    // Seats availability scoring
    if (parsed.seats) {
      const seatsScore = this.scoreSeats(parsed.seats);
      breakdown.push(seatsScore);
      totalScore += seatsScore.points;
    }

    // Intent clarity scoring
    if (parsed.intent !== 'unknown') {
      const intentScore = this.scoreIntent(parsed.intent);
      breakdown.push(intentScore);
      totalScore += intentScore.points;
    }

    // Phone number scoring
    if (parsed.phone) {
      const phoneScore = this.scorePhone(parsed.phone);
      breakdown.push(phoneScore);
      totalScore += phoneScore.points;
    }

    // Location scoring
    if (parsed.fromLocation || parsed.toLocation) {
      const locationScore = this.scoreLocation(parsed);
      breakdown.push(locationScore);
      totalScore += locationScore.points;
    }

    // Overall confidence bonus
    if (parsed.confidence >= 7) {
      breakdown.push({
        category: 'CONFIDENCE_BONUS',
        points: 1,
        reason: 'High parsing confidence',
      });
      totalScore += 1;
    }

    return {
      score: totalScore,
      maxScore: 10,
      isValid: totalScore >= SCORING_THRESHOLD,
      breakdown,
    };
  }

  /**
   * Score time component
   */
  private scoreTime(time: string): ScoringBreakdown {
    const urgentKeywords = ['hozir', 'xozir', 'hozirga', 'xozirga', 'srochni', 'srochna'];
    const isUrgent = urgentKeywords.some(kw => time.toLowerCase().includes(kw));

    return {
      category: 'TIME',
      points: isUrgent ? 3 : 2,
      reason: isUrgent ? 'Urgent time request' : 'Time specified',
    };
  }

  /**
   * Score seats component
   */
  private scoreSeats(seats: number): ScoringBreakdown {
    if (seats >= 1 && seats <= 4) {
      return {
        category: 'SEATS',
        points: 2,
        reason: `Valid seat count: ${seats}`,
      };
    }
    return {
      category: 'SEATS',
      points: 1,
      reason: `Unusual seat count: ${seats}`,
    };
  }

  /**
   * Score intent component
   */
  private scoreIntent(intent: string): ScoringBreakdown {
    if (intent === 'client') {
      return {
        category: 'INTENT',
        points: 2,
        reason: 'Clear client intent',
      };
    }
    if (intent === 'driver') {
      return {
        category: 'INTENT',
        points: 2,
        reason: 'Clear driver intent',
      };
    }
    return {
      category: 'INTENT',
      points: 0,
      reason: 'Unknown intent',
    };
  }

  /**
   * Score phone component
   */
  private scorePhone(phone: string): ScoringBreakdown {
    const isValidPhone = /^(\+?998\d{9}|\d{9})$/.test(phone);
    return {
      category: 'PHONE',
      points: isValidPhone ? 2 : 1,
      reason: isValidPhone ? 'Valid phone number' : 'Partial phone number',
    };
  }

  /**
   * Score location component
   */
  private scoreLocation(parsed: ParsedRequest): ScoringBreakdown {
    const hasFrom = !!parsed.fromLocation;
    const hasTo = !!parsed.toLocation;

    if (hasFrom && hasTo) {
      return {
        category: 'LOCATION',
        points: 2,
        reason: 'Both from and to locations specified',
      };
    }
    if (hasFrom || hasTo) {
      return {
        category: 'LOCATION',
        points: 1,
        reason: 'Partial location specified',
      };
    }
    return {
      category: 'LOCATION',
      points: 0,
      reason: 'No location specified',
    };
  }
}
