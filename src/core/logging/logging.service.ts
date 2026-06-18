import { Injectable, Logger } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  log(message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      context,
      timestamp: new Date(),
      metadata,
    };
    this.addLog(entry);
    this.logger.log(message, context);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      context,
      timestamp: new Date(),
      metadata,
    };
    this.addLog(entry);
    this.logger.warn(message, context);
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      context,
      timestamp: new Date(),
      metadata,
    };
    this.addLog(entry);
    this.logger.error(message, context);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      context,
      timestamp: new Date(),
      metadata,
    };
    this.addLog(entry);
    this.logger.debug(message, context);
  }

  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    return filtered.slice(-limit);
  }

  clearLogs() {
    this.logs.length = 0;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}
