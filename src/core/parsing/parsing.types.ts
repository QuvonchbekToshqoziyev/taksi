export enum TokenCategory {
  TIME = 'TIME',
  SEATS = 'SEATS',
  INTENT = 'INTENT',
  LOCATION = 'LOCATION',
  PHONE = 'PHONE',
  NOISE = 'NOISE',
}

export interface ClassifiedToken {
  value: string;
  category: TokenCategory;
  confidence: number; // 0-1
}

export interface ParsedRequest {
  time?: string;
  seats?: number;
  intent: 'client' | 'driver' | 'unknown';
  fromLocation?: string;
  toLocation?: string;
  phone?: string;
  rawTokens: ClassifiedToken[];
  confidence: number; // 0-10
}
