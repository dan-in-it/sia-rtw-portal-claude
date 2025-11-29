type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }
        : { error }),
    };

    console.error(this.formatMessage('error', message, errorContext));

    // In production, send to error tracking service
    if (!this.isDevelopment) {
      // await sendToSentry(message, errorContext);
    }
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    context?: {
      userId?: string;
      ip?: string;
      statusCode?: number;
      duration?: number;
      [key: string]: any;
    }
  ): void {
    const message = `${method} ${path}`;
    this.info(message, context);
  }

  /**
   * Log database query (for debugging)
   */
  logQuery(query: string, duration?: number): void {
    if (this.isDevelopment) {
      this.debug('Database Query', { query, duration });
    }
  }

  /**
   * Log user action for audit trail
   */
  logAudit(
    action: string,
    context: {
      userId: string;
      entityType: string;
      entityId?: string;
      metadata?: any;
    }
  ): void {
    this.info(`Audit: ${action}`, context);
  }

  /**
   * Log security event
   */
  logSecurity(event: string, context: LogContext): void {
    this.warn(`Security: ${event}`, context);
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    if (duration > 1000) {
      // Log slow operations
      this.warn(`Slow Operation: ${operation}`, { duration, ...context });
    } else if (this.isDevelopment) {
      this.debug(`Performance: ${operation}`, { duration, ...context });
    }
  }
}

export const logger = new Logger();

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(context?: LogContext): number {
    const duration = Date.now() - this.startTime;
    logger.logPerformance(this.operation, duration, context);
    return duration;
  }
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = new PerformanceTimer(operation);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end({ error: true });
    throw error;
  }
}
