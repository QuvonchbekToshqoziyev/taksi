import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramRetryService {
  private readonly logger = new Logger(TelegramRetryService.name);

  /**
   * Execute a Telegram API call with retry logic for rate limits
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    context = 'Telegram API',
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const code = error?.response?.error_code;
        const retryAfter = error?.response?.parameters?.retry_after;
        const description = error?.response?.description || error?.message || '';

        // Handle rate limiting (429)
        if (code === 429 && retryAfter) {
          const waitTime = (retryAfter + 1) * 1000;
          this.logger.warn(
            `Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`,
            context,
          );
          await this.sleep(waitTime);
          continue;
        }

        // Handle flood wait errors
        if (description.includes('flood') || description.includes('FLOOD_WAIT')) {
          const waitMatch = description.match(/(\d+)/);
          const waitTime = waitMatch ? parseInt(waitMatch[1]) * 1000 : 5000;
          this.logger.warn(
            `Flood wait detected. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`,
            context,
          );
          await this.sleep(waitTime);
          continue;
        }

        // Don't retry certain errors
        if (this.isNonRetryableError(description)) {
          this.logger.error(`Non-retryable error: ${description}`, context);
          throw error;
        }

        // For other errors, wait and retry
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warn(
            `Error: ${description}. Retrying in ${waitTime}ms (${attempt}/${maxRetries})`,
            context,
          );
          await this.sleep(waitTime);
        }
      }
    }

    this.logger.error(`Failed after ${maxRetries} retries`, context, { error: lastError });
    throw lastError;
  }

  /**
   * Add delay between Telegram API calls to avoid rate limits
   */
  async delay(ms = 120): Promise<void> {
    await this.sleep(ms);
  }

  /**
   * Check if error is related to write permissions
   */
  isWriteForbidden(error: any): boolean {
    const desc = this.getErrorDescription(error).toLowerCase();
    return (
      desc.includes('chat_write_forbidden') ||
      desc.includes('forbidden') ||
      desc.includes('bot was kicked') ||
      desc.includes('not a member')
    );
  }

  /**
   * Check if error is related to protected content
   */
  isProtectedError(error: any): boolean {
    const desc = this.getErrorDescription(error).toLowerCase();
    return desc.includes('protected') || desc.includes('content is protected');
  }

  /**
   * Check if user blocked the bot
   */
  isBlockedError(error: any): boolean {
    const desc = this.getErrorDescription(error).toLowerCase();
    return desc.includes('bot was blocked') || desc.includes('user is deactivated');
  }

  /**
   * Safely send a message, handling common errors
   */
  async safeSendMessage(
    telegram: any,
    chatId: number | string,
    text: string,
    extra?: any,
  ): Promise<any | null> {
    try {
      return await this.withRetry(
        () => telegram.sendMessage(chatId, text, extra),
        3,
        `sendMessage to ${chatId}`,
      );
    } catch (error: any) {
      if (this.isBlockedError(error)) {
        this.logger.warn(`User blocked bot or deactivated: ${chatId}`);
        return null;
      }
      if (this.isWriteForbidden(error)) {
        this.logger.warn(`Write forbidden: ${chatId}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Safely forward a message
   */
  async safeForwardMessage(
    telegram: any,
    chatId: number | string,
    fromChatId: number | string,
    messageId: number,
  ): Promise<any | null> {
    try {
      return await this.withRetry(
        () => telegram.forwardMessage(chatId, fromChatId, messageId),
        3,
        `forwardMessage to ${chatId}`,
      );
    } catch (error: any) {
      if (this.isWriteForbidden(error)) {
        this.logger.warn(`Forward forbidden: ${chatId}`);
        return null;
      }
      throw error;
    }
  }

  private isNonRetryableError(description: string): boolean {
    const nonRetryable = [
      'bad request',
      'chat not found',
      'message to forward not found',
      'message identifier is not specified',
    ];
    const desc = description.toLowerCase();
    return nonRetryable.some(keyword => desc.includes(keyword));
  }

  private getErrorDescription(error: any): string {
    return error?.response?.description || error?.description || error?.message || '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
