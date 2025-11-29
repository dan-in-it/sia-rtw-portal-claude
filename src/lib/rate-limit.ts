import { RateLimitError } from './errors';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar
const store = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiter for API routes
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @throws RateLimitError if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  }
): void {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return;
  }

  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    throw new RateLimitError(
      `Too many requests. Please try again in ${retryAfter} seconds.`
    );
  }

  // Increment count
  record.count++;
}

/**
 * Get rate limit info for an identifier
 */
export function getRateLimitInfo(identifier: string, maxRequests: number = 100): {
  remaining: number;
  resetTime: number;
  total: number;
} {
  const record = store.get(identifier);
  const now = Date.now();

  if (!record || now > record.resetTime) {
    return {
      remaining: maxRequests,
      resetTime: now + 900000, // 15 minutes
      total: maxRequests,
    };
  }

  return {
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
    total: maxRequests,
  };
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP address from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  const ip =
    forwardedFor?.split(',')[0].trim() ||
    realIp ||
    cfConnectingIp ||
    'unknown';

  return ip;
}

/**
 * Rate limiter middleware for different endpoints
 */
export const rateLimiters = {
  auth: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    }),

  api: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
    }),

  chatbot: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 20,
      windowMs: 60 * 1000, // 1 minute
    }),

  upload: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    }),

  strict: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    }),
};
