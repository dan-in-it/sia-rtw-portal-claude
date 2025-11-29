import crypto from 'crypto';
import { AuthenticationError, AuthorizationError } from './errors';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Session security utilities
 */

export interface SessionOptions {
  maxAge?: number; // in seconds
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  maxAge: 60 * 60 * 24, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
};

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a value using SHA-256
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify user has required role
 */
export async function requireRole(
  userId: string,
  requiredRole: 'MEMBER' | 'LIAISON' | 'LEGAL' | 'ADMIN'
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  if (!user.isActive) {
    throw new AuthenticationError('User account is inactive');
  }

  const roleHierarchy = {
    MEMBER: 0,
    LIAISON: 1,
    LEGAL: 2,
    ADMIN: 3,
  };

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    logger.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', {
      userId,
      requiredRole,
      userRole: user.role,
    });
    throw new AuthorizationError(`This action requires ${requiredRole} role or higher`);
  }
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(
  userId: string,
  resourceType: 'post' | 'reply' | 'escalation',
  resourceId: string
): Promise<void> {
  let isOwner = false;

  switch (resourceType) {
    case 'post':
      const post = await prisma.post.findUnique({
        where: { id: resourceId },
        select: { authorId: true },
      });
      isOwner = post?.authorId === userId;
      break;

    case 'reply':
      const reply = await prisma.reply.findUnique({
        where: { id: resourceId },
        select: { authorId: true },
      });
      isOwner = reply?.authorId === userId;
      break;

    case 'escalation':
      const escalation = await prisma.escalation.findUnique({
        where: { id: resourceId },
        select: { requesterId: true },
      });
      isOwner = escalation?.requesterId === userId;
      break;
  }

  if (!isOwner) {
    logger.logSecurity('UNAUTHORIZED_RESOURCE_ACCESS', {
      userId,
      resourceType,
      resourceId,
    });
    throw new AuthorizationError('You do not own this resource');
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * IP address extraction from request
 */
export function getIpAddress(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  return (
    forwardedFor?.split(',')[0].trim() ||
    realIp ||
    cfConnectingIp ||
    'unknown'
  );
}

/**
 * Log security event with full context
 */
export async function logSecurityEvent(
  event: string,
  req: Request,
  context?: Record<string, any>
) {
  const ip = getIpAddress(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';

  logger.logSecurity(event, {
    ip,
    userAgent,
    path: new URL(req.url).pathname,
    method: req.method,
    ...context,
  });

  // Also create audit log in database for critical security events
  if (['FAILED_LOGIN', 'UNAUTHORIZED_ACCESS', 'RATE_LIMIT_EXCEEDED'].includes(event)) {
    try {
      await prisma.auditLog.create({
        data: {
          action: event,
          entityType: 'security',
          ipAddress: ip,
          metadata: {
            userAgent,
            path: new URL(req.url).pathname,
            ...context,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to create security audit log', error);
    }
  }
}

/**
 * Validate session token
 */
export function validateSessionToken(token: string): boolean {
  // Token should be a valid UUID or secure random string
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const secureTokenRegex = /^[0-9a-f]{64}$/i; // 32-byte hex string

  return uuidRegex.test(token) || secureTokenRegex.test(token);
}

/**
 * Password strength requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional but recommended
};

/**
 * Common passwords to blacklist
 */
export const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
]);

/**
 * Check if password is commonly used
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
