import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError, createErrorResponse, HTTP_STATUS } from '../utils';

// Export validation schemas
export * from './validation';

// Enhanced global error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = { ...err } as AppError;
  error.message = err.message;

  // Enhanced structured error logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
      params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
    },
  };

  console.error('🚨 Error:', JSON.stringify(errorLog, null, process.env.NODE_ENV === 'development' ? 2 : 0));

  // Default error response
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let code = err.name || 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle operational errors (custom AppError)
  if (error.isOperational) {
    statusCode = error.statusCode;
    message = error.message;
    code = 'APP_ERROR';
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = err.issues.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    statusCode = HTTP_STATUS.BAD_REQUEST;
    
    switch (prismaError.code) {
      case 'P2002':
        message = 'Unique constraint violation';
        code = 'DUPLICATE_ENTRY';
        details = { field: prismaError.meta?.target };
        break;
      case 'P2025':
        statusCode = HTTP_STATUS.NOT_FOUND;
        message = 'Record not found';
        code = 'NOT_FOUND';
        break;
      default:
        message = 'Database error';
        code = 'DATABASE_ERROR';
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Handle syntax errors (malformed JSON)
  if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid JSON format';
    code = 'INVALID_JSON';
  }

  // Handle cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  // Handle validation errors (generic)
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  }

  // Send error response
  res
    .status(statusCode)
    .json(
      createErrorResponse(
        message,
        code,
        process.env.NODE_ENV === 'development' ? details || err.stack : details
      )
    );
};

// 404 handler middleware
export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(HTTP_STATUS.NOT_FOUND)
    .json(
      createErrorResponse(
        `Route ${req.originalUrl} not found`,
        'ROUTE_NOT_FOUND'
      )
    );
};

// Enhanced structured request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('📥 Request:', JSON.stringify(requestLog, null, 2));
  } else {
    console.log('Request:', JSON.stringify(requestLog));
  }

  // Override res.end to log response details
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    
    const responseLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Response:', JSON.stringify(responseLog, null, 2));
    } else {
      console.log('Response:', JSON.stringify(responseLog));
    }

    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
};

// Request validation middleware factory
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        // Return the first validation error message as the main message
        const firstError = validationErrors[0];
        const mainMessage = firstError ? firstError.message : 'Validation failed';

        res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createErrorResponse(
              mainMessage,
              'VALIDATION_ERROR',
              validationErrors
            )
          );
        return;
      }

      next(error);
    }
  };
};

// Rate limiting middleware (basic implementation)
export const rateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const clientData = requests.get(clientId);

    if (!clientData) {
      requests.set(clientId, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (clientData.resetTime < now) {
      // Reset window
      requests.set(clientId, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (clientData.count >= options.maxRequests) {
      res
        .status(HTTP_STATUS.TOO_MANY_REQUESTS)
        .json(
          createErrorResponse(
            options.message || 'Too many requests',
            'RATE_LIMIT_EXCEEDED',
            {
              limit: options.maxRequests,
              windowMs: options.windowMs,
              retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
            }
          )
        );
      return;
    }

    clientData.count++;
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Export authentication middleware
export { AuthMiddleware, createAuthMiddleware } from './auth.middleware';
