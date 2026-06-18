import { Injectable, Logger } from '@nestjs/common';
import { KeywordService } from '../../keyword/keyword.service';
import { ClassifiedToken, TokenCategory, ParsedRequest } from './parsing.types';

@Injectable()
export class ParsingEngine {
  private readonly logger = new Logger(ParsingEngine.name);

  constructor(private readonly keywordService: KeywordService) {}

  /**
   * Main entry point: parse raw text into structured request
   */
  parse(text: string): ParsedRequest {
    const normalized = this.normalize(text);
    const tokens = this.tokenize(normalized);
    const classified = this.classifyTokens(tokens);
    
    return this.extractStructuredData(classified, normalized);
  }

  /**
   * Normalize text: lowercase, remove noise, separate numbers/letters
   */
  private normalize(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[ʻʼ'`'']/g, '')
      .replace(/(\p{N})(\p{L})/gu, '$1 $2')
      .replace(/(\p{L})(\p{N})/gu, '$1 $2')
      .replace(/[.,!?;:()[\]{}"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Split text into tokens
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(Boolean);
  }

  /**
   * Classify each token into categories
   */
  private classifyTokens(tokens: string[]): ClassifiedToken[] {
    const classified: ClassifiedToken[] = [];
    
    for (const token of tokens) {
      const category = this.categorizeToken(token);
      classified.push({
        value: token,
        category,
        confidence: this.getConfidence(token, category),
      });
    }

    return classified;
  }

  /**
   * Categorize a single token
   */
  private categorizeToken(token: string): TokenCategory {
    // Phone number
    if (/^(\+?998\d{9}|\d{9})$/.test(token)) {
      return TokenCategory.PHONE;
    }

    // Seats (numbers 1-9)
    if (/^[1-9]$/.test(token) || /^(bir|ikki|uch|to'rt|besh|olti|yetti|sakkiz|to'qqiz)$/i.test(token)) {
      return TokenCategory.SEATS;
    }

    // Time indicators
    const timeKeywords = ['hozir', 'xozir', 'hozirga', 'xozirga', 'ertaga', 'kechqurun', 'ertalab', 'tunda', 'kunduzi'];
    if (timeKeywords.some(kw => token.includes(kw))) {
      return TokenCategory.TIME;
    }

    // Intent keywords (client)
    const clientKeywords = this.keywordService.getClientKeywords();
    const hardcodedClient = ['kerak', 'kere', 'kk', 'zakaz', 'bormi', 'boraman', 'boramiz', 'srochni', 'srochna'];
    if ([...clientKeywords, ...hardcodedClient].some(kw => token.includes(kw))) {
      return TokenCategory.INTENT;
    }

    // Intent keywords (driver)
    const driverKeywords = this.keywordService.getDriverKeywords();
    const hardcodedDriver = ['bor', 'olamiz', 'olaman', 'ketadi', 'boradi', 'obketaman'];
    if ([...driverKeywords, ...hardcodedDriver].some(kw => token.includes(kw))) {
      return TokenCategory.INTENT;
    }

    return TokenCategory.NOISE;
  }

  /**
   * Get confidence score for a token classification
   */
  private getConfidence(token: string, category: TokenCategory): number {
    switch (category) {
      case TokenCategory.PHONE:
        return 1.0;
      case TokenCategory.SEATS:
        return /^[1-9]$/.test(token) ? 0.9 : 0.6;
      case TokenCategory.TIME:
        return 0.8;
      case TokenCategory.INTENT:
        return 0.7;
      default:
        return 0.3;
    }
  }

  /**
   * Extract structured data from classified tokens
   */
  private extractStructuredData(tokens: ClassifiedToken[], normalized: string): ParsedRequest {
    const result: ParsedRequest = {
      intent: 'unknown',
      rawTokens: tokens,
      confidence: 0,
    };

    // Extract phone
    const phoneToken = tokens.find(t => t.category === TokenCategory.PHONE);
    if (phoneToken) {
      result.phone = phoneToken.value;
    }

    // Extract seats
    const seatsToken = tokens.find(t => t.category === TokenCategory.SEATS);
    if (seatsToken) {
      result.seats = this.parseSeats(seatsToken.value);
    }

    // Extract time
    const timeToken = tokens.find(t => t.category === TokenCategory.TIME);
    if (timeToken) {
      result.time = timeToken.value;
    }

    // Determine intent
    result.intent = this.determineIntent(tokens, normalized);

    // Calculate confidence score
    result.confidence = this.calculateConfidence(result, tokens);

    return result;
  }

  /**
   * Parse seats value from token
   */
  private parseSeats(value: string): number {
    const uzNumbers: Record<string, number> = {
      'bir': 1, 'ikki': 2, 'uch': 3, "to'rt": 4, 'besh': 5,
      'olti': 6, 'yetti': 7, 'sakkiz': 8, "to'qqiz": 9,
    };
    return uzNumbers[value.toLowerCase()] || parseInt(value, 10) || 1;
  }

  /**
   * Determine intent from classified tokens
   */
  private determineIntent(tokens: ClassifiedToken[], text: string): 'client' | 'driver' | 'unknown' {
    const hasClient = this.hasClientIntent(tokens, text);
    const hasDriver = this.hasDriverIntent(tokens, text);

    if (hasDriver && !hasClient) return 'driver';
    if (hasClient && !hasDriver) return 'client';
    
    // If both present, check which has stronger signals
    if (hasDriver && hasClient) {
      // Driver phrases are more specific (olamiz, obketaman, etc.)
      const driverSpecificPhrases = ['olamiz', 'olaman', 'obketaman', 'olib ketaman', 'ketadi', 'boradi'];
      const hasDriverSpecific = driverSpecificPhrases.some(p => text.includes(p));
      if (hasDriverSpecific) return 'driver';
      return 'client';
    }

    return 'unknown';
  }

  /**
   * Check if text has client intent
   */
  private hasClientIntent(intentTokens: ClassifiedToken[], text: string): boolean {
    const clientPhrases = [
      'kerak', 'kere', 'kk', 'zakaz', 'bormi', 'boraman', 'boramiz',
      'srochni', 'srochna', 'moshina', 'mashina',
      // Cyrillic variants
      'керак', 'кк', 'заказ', 'борми', 'срочни', 'срочна',
    ];
    // "taksi"/"такси" alone is ambiguous, only count if combined with other client phrases
    const hasTaksi = text.includes('taksi') || text.includes('taxi') || text.includes('такси') || text.includes('такси');
    const hasOtherClient = clientPhrases.some(phrase => text.includes(phrase));
    return hasOtherClient || (hasTaksi && hasOtherClient);
  }

  /**
   * Check if text has driver intent
   */
  private hasDriverIntent(intentTokens: ClassifiedToken[], text: string): boolean {
    const driverPhrases = [
      'olamiz', 'olaman', 'ketadi', 'boradi', 'obketaman',
      'olib ketaman',
    ];
    return driverPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * Calculate overall confidence score (0-10)
   */
  private calculateConfidence(parsed: ParsedRequest, tokens: ClassifiedToken[]): number {
    let score = 0;

    // +2 for time
    if (parsed.time) score += 2;

    // +2 for seats
    if (parsed.seats) score += 2;

    // +1 for intent
    if (parsed.intent !== 'unknown') score += 1;

    // +1 for phone
    if (parsed.phone) score += 1;

    // +1 for each high-confidence token
    const highConfTokens = tokens.filter(t => t.confidence > 0.7);
    score += Math.min(highConfTokens.length, 4);

    return Math.min(score, 10);
  }
}
