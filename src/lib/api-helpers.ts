import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { handleError } from './errors';
import { verifyCsrfToken } from './csrf';
import { rateLimiters, getClientIdentifier } from './rate-limit';
import { logger, PerformanceTimer } from './logger';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

/**
 * API route wrapper with comprehensive security and logging
 */
export interface ApiHandlerOptions {
  requireAuth?: boolean;
  requireRole?: UserRole;
  enableCsrf?: boolean;
  rateLimit?: 'auth' | 'api' | 'chatbot' | 'upload' | 'strict';
  enableAudit?: boolean;
  auditAction?: string;
}

export function createApiHandler(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
) {
  const {
    requireAuth = false,
    requireRole,
    enableCsrf = true,
    rateLimit,
    enableAudit = false,
    auditAction,
  } = options;

  return async (req: NextRequest, routeContext?: any): Promise<NextResponse> => {
    const timer = new PerformanceTimer(`${req.method} ${req.nextUrl.pathname}`);
    const clientIp = getClientIdentifier(req);

    try {
      // 1. Rate limiting
      if (rateLimit) {
        rateLimiters[rateLimit](clientIp);
      }

      // 2. CSRF protection for non-GET requests
      if (enableCsrf && req.method !== 'GET') {
        await verifyCsrfToken(req);
      }

      // 3. Authentication check
      let session = null;
      let user = null;

      if (requireAuth) {
        session = await getServerSession(authOptions);

        if (!session?.user?.id) {
          logger.logSecurity('UNAUTHORIZED_API_ACCESS', {
            path: req.nextUrl.pathname,
            method: req.method,
            ip: clientIp,
          });
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        // Fetch full user data
        user = await prisma.user.findUnique({
          where: { id: session.user.id },
        });

        if (!user || !user.isActive) {
          return NextResponse.json(
            { error: 'Account is inactive' },
            { status: 403 }
          );
        }

        // 4. Role-based authorization
        if (requireRole) {
          const roleHierarchy: Record<UserRole, number> = {
            MEMBER: 0,
            LIAISON: 1,
            LEGAL: 2,
            ADMIN: 3,
          };

          if (roleHierarchy[user.role] < roleHierarchy[requireRole]) {
            logger.logSecurity('UNAUTHORIZED_ROLE_ACCESS', {
              userId: user.id,
              userRole: user.role,
              requiredRole: requireRole,
              path: req.nextUrl.pathname,
            });

            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            );
          }
        }
      }

      // 5. Create context with user and utilities
      const context: ApiContext = {
        user: user || undefined,
        session: session || undefined,
        req,
        routeParams: routeContext?.params || {},
      };

      // 6. Execute handler
      const response = await handler(req, context);

      // 7. Audit logging
      if (enableAudit && user && auditAction) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: auditAction,
            entityType: 'api',
            metadata: {
              path: req.nextUrl.pathname,
              method: req.method,
            },
            ipAddress: clientIp,
          },
        });
      }

      // 8. Log successful request
      const duration = timer.end();
      logger.logRequest(req.method, req.nextUrl.pathname, {
        userId: user?.id,
        statusCode: response.status,
        duration,
        ip: clientIp,
      });

      return response;
    } catch (error) {
      const duration = timer.end({ error: true });

      logger.error(
        `API Error: ${req.method} ${req.nextUrl.pathname}`,
        error,
        {
          duration,
          ip: clientIp,
        }
      );

      return handleError(error);
    }
  };
}

export interface ApiContext {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
  };
  session?: any;
  req: NextRequest;
  routeParams: Record<string, string>;
}

/**
 * Helper to create audit log entries
 */
export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', error, {
      userId,
      action,
      entityType,
    });
  }
}

/**
 * Parse and validate request body with Zod schema
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: any
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    throw error;
  }
}

/**
 * Parse and validate query parameters
 */
export function parseQuery<T>(
  req: NextRequest,
  schema: any
): T {
  const { searchParams } = req.nextUrl;
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return schema.parse(params);
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}
