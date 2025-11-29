import crypto from 'crypto';
import { cookies } from 'next/headers';
import { AuthenticationError } from './errors';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get or create CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = generateCsrfToken();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  return token;
}

/**
 * Verify CSRF token from request
 * @throws AuthenticationError if token is invalid
 */
export async function verifyCsrfToken(req: Request): Promise<void> {
  // Skip CSRF check for GET, HEAD, OPTIONS
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken) {
    throw new AuthenticationError('CSRF token not found in cookies');
  }

  if (!headerToken) {
    throw new AuthenticationError('CSRF token not found in request header');
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(cookieToken, headerToken)) {
    throw new AuthenticationError('Invalid CSRF token');
  }
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * CSRF protection middleware for API routes
 */
export function withCsrfProtection(
  handler: (req: Request, context?: any) => Promise<Response>
) {
  return async (req: Request, context?: any): Promise<Response> => {
    await verifyCsrfToken(req);
    return handler(req, context);
  };
}

/**
 * Get CSRF token for client-side usage
 * Call this from a GET endpoint to provide token to client
 */
export async function getCsrfTokenForClient(): Promise<string> {
  return await getCsrfToken();
}
