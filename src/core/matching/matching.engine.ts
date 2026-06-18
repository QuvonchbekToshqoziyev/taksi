import { Injectable, Logger } from '@nestjs/common';
import { DriverProfile, ClientRequest, MatchResult } from './matching.types';

@Injectable()
export class MatchingEngine {
  private readonly logger = new Logger(MatchingEngine.name);

  /**
   * Find best driver matches for a client request
   */
  findMatches(
    request: ClientRequest,
    availableDrivers: DriverProfile[],
  ): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const driver of availableDrivers) {
      const score = this.calculateMatchScore(driver, request);
      if (score.score > 0) {
        matches.push(score);
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate match score between driver and request
   */
  private calculateMatchScore(driver: DriverProfile, request: ClientRequest): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // Route matching (highest priority)
    const routeScore = this.scoreRoute(driver, request);
    score += routeScore.score;
    reasons.push(...routeScore.reasons);

    // Seats availability
    const seatsScore = this.scoreSeats(driver, request);
    score += seatsScore.score;
    reasons.push(...seatsScore.reasons);

    // Time proximity
    const timeScore = this.scoreTime(driver, request);
    score += timeScore.score;
    reasons.push(...timeScore.reasons);

    // Features match
    const featuresScore = this.scoreFeatures(driver, request);
    score += featuresScore.score;
    reasons.push(...featuresScore.reasons);

    // Driver activity recency
    const activityScore = this.scoreActivity(driver);
    score += activityScore.score;
    reasons.push(...activityScore.reasons);

    return {
      driverId: driver.id,
      requestId: request.id,
      score,
      reasons,
    };
  }

  /**
   * Score route compatibility
   */
  private scoreRoute(driver: DriverProfile, request: ClientRequest): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (driver.toLocation && request.toLocation) {
      if (driver.toLocation.toLowerCase() === request.toLocation.toLowerCase()) {
        score += 10;
        reasons.push('Exact destination match');
      } else if (driver.toLocation.toLowerCase().includes(request.toLocation.toLowerCase())) {
        score += 5;
        reasons.push('Partial destination match');
      }
    }

    if (driver.fromLocation && request.fromLocation) {
      if (driver.fromLocation.toLowerCase() === request.fromLocation.toLowerCase()) {
        score += 5;
        reasons.push('Exact pickup match');
      }
    }

    return { score, reasons };
  }

  /**
   * Score seats availability
   */
  private scoreSeats(driver: DriverProfile, request: ClientRequest): { score: number; reasons: string[] } {
    if (driver.seatsAvailable >= request.seats) {
      return {
        score: 5,
        reasons: [`Sufficient seats: ${driver.seatsAvailable} >= ${request.seats}`],
      };
    }
    return {
      score: 0,
      reasons: [`Insufficient seats: ${driver.seatsAvailable} < ${request.seats}`],
    };
  }

  /**
   * Score time proximity
   */
  private scoreTime(driver: DriverProfile, request: ClientRequest): { score: number; reasons: string[] } {
    // If driver is available and request is new, give base score
    if (driver.state === 'AVAILABLE') {
      return {
        score: 3,
        reasons: ['Driver available now'],
      };
    }
    return { score: 0, reasons: [] };
  }

  /**
   * Score features match
   */
  private scoreFeatures(driver: DriverProfile, request: ClientRequest): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const commonFeatures = driver.features.filter(f => request.features.includes(f));
    if (commonFeatures.length > 0) {
      score = commonFeatures.length * 2;
      reasons.push(`Matching features: ${commonFeatures.join(', ')}`);
    }

    return { score, reasons };
  }

  /**
   * Score driver activity recency
   */
  private scoreActivity(driver: DriverProfile): { score: number; reasons: string[] } {
    const minutesSinceActive = (Date.now() - driver.lastActive.getTime()) / 60000;

    if (minutesSinceActive < 5) {
      return { score: 2, reasons: ['Driver active recently (< 5 min)'] };
    }
    if (minutesSinceActive < 15) {
      return { score: 1, reasons: ['Driver active recently (< 15 min)'] };
    }
    return { score: 0, reasons: ['Driver inactive'] };
  }
}
