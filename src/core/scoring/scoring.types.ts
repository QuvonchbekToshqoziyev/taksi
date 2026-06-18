export interface ScoringResult {
  score: number;
  maxScore: number;
  isValid: boolean;
  breakdown: ScoringBreakdown[];
}

export interface ScoringBreakdown {
  category: string;
  points: number;
  reason: string;
}

export const SCORING_THRESHOLD = 4;
