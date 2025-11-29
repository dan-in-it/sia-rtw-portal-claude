import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string>) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(429, message, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'An internal server error occurred') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleError(error: unknown): NextResponse {
  // Log error
  console.error('[Error Handler]:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    error.errors.forEach((err) => {
      if (err.path.length > 0) {
        errors[err.path[0] as string] = err.message;
      }
    });

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      { status: 400 }
    );
  }

  // Handle known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.errors
          ? { details: error.errors }
          : {}),
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'A record with this value already exists',
            code: 'DUPLICATE_ERROR',
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Record not found',
            code: 'NOT_FOUND_ERROR',
          },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          {
            error: 'Database error occurred',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        );
    }
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Async error handler wrapper for API routes
 */
export function asyncHandler(
  handler: (req: any, context?: any) => Promise<NextResponse>
) {
  return async (req: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Error logging utility
 */
export function logError(
  error: unknown,
  context?: {
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: any;
  }
) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  };

  // In production, send to error tracking service (Sentry, etc.)
  console.error('[Error]:', JSON.stringify(errorInfo, null, 2));

  // You could also write to a log file or send to a logging service
  // await writeToLogFile(errorInfo);
  // await sendToSentry(errorInfo);
}

/**
 * Format error for client display
 */
export function formatErrorForClient(error: unknown): {
  message: string;
  code?: string;
  details?: any;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      ...(error instanceof ValidationError && error.errors
        ? { details: error.errors }
        : {}),
    };
  }

  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    error.errors.forEach((err) => {
      if (err.path.length > 0) {
        errors[err.path[0] as string] = err.message;
      }
    });

    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
