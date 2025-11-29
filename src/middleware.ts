import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  const headers = response.headers;

  // Strict-Transport-Security (HSTS)
  // Force HTTPS for 1 year, including subdomains
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // X-Frame-Options - Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options - Prevent MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection - Enable XSS filter (legacy but still useful)
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy - Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - Control browser features
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content-Security-Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval/inline in dev
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  if (process.env.NODE_ENV === 'production') {
    headers.set('Content-Security-Policy', cspDirectives.join('; '));
  } else {
    // More permissive in development
    headers.set('Content-Security-Policy-Report-Only', cspDirectives.join('; '));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
