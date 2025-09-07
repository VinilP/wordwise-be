import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  validateRequest, 
  rateLimiter,
  securityHeaders 
} from '../src/middleware';
import { AppError, HTTP_STATUS } from '../src/utils';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      originalUrl: '/test',
      path: '/test',
      query: {},
      params: {},
      body: {},
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'test-user-agent';
        return undefined;
      }),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Clear mocks
    mockConsoleError.mockClear();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle operational errors', () => {
      const error = new AppError('Test error', HTTP_STATUS.BAD_REQUEST);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          code: 'APP_ERROR',
          details: undefined,
        },
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation Error',
          code: 'VALIDATION_ERROR',
          details: undefined,
        },
      });
    });

    it('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          details: undefined,
        },
      });
    });

    it('should handle token expired errors', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          details: undefined,
        },
      });
    });

    it('should handle Zod validation errors', () => {
      // Create a ZodError by trying to parse invalid data
      let zodError: ZodError;
      try {
        z.object({ email: z.string().email() }).parse({ email: 123 });
      } catch (error) {
        zodError = error as ZodError;
      }

      errorHandler(zodError!, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Invalid input: expected string, received number',
            }),
          ]),
        },
      });
    });

    it('should handle Prisma unique constraint errors', () => {
      const prismaError = new Error('Unique constraint failed');
      prismaError.name = 'PrismaClientKnownRequestError';
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['email'] };

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unique constraint violation',
          code: 'DUPLICATE_ENTRY',
          details: { field: ['email'] },
        },
      });
    });

    it('should handle Prisma record not found errors', () => {
      const prismaError = new Error('Record not found');
      prismaError.name = 'PrismaClientKnownRequestError';
      (prismaError as any).code = 'P2025';

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
          details: undefined,
        },
      });
    });

    it('should handle JSON syntax errors', () => {
      const syntaxError = new SyntaxError('Unexpected token in JSON');
      errorHandler(syntaxError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid JSON format',
          code: 'INVALID_JSON',
          details: undefined,
        },
      });
    });

    it('should handle Prisma unknown error code', () => {
      const prismaError = new Error('Unknown Prisma error');
      prismaError.name = 'PrismaClientKnownRequestError';
      (prismaError as any).code = 'P9999';
      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error',
          code: 'DATABASE_ERROR',
          details: undefined,
        },
      });
    });

    it('should handle CastError', () => {
      const error = new Error('Cast error');
      error.name = 'CastError';
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid ID format',
          code: 'INVALID_ID',
          details: undefined,
        },
      });
    });

    it('should handle generic error', () => {
      const error = new Error('Some error');
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal Server Error',
          code: 'Error',
          details: undefined,
        },
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal Server Error',
          code: 'Error',
          details: undefined,
        },
      });
    });

    it('should log error details', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith('🚨 Error:', expect.stringContaining('Test error'));
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for non-existent routes', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Route /test not found',
          code: 'ROUTE_NOT_FOUND',
        },
      });
    });
  });

  describe('requestLogger', () => {
    it('should log request and response in production', () => {
      process.env.NODE_ENV = 'production';
      const req = { ...mockRequest } as Request;
      const res: any = {
        ...mockResponse,
        statusCode: 200,
        get: jest.fn().mockReturnValue('123'),
        end: undefined,
      };
      const next = jest.fn();
      requestLogger(req, res, next);
      // Simulate response end
      res.end();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Request:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Response:'));
      expect(next).toHaveBeenCalled();
      process.env.NODE_ENV = 'test';
    });
    beforeEach(() => {
      mockResponse.end = jest.fn();
      mockResponse.get = jest.fn().mockReturnValue(undefined);
    });

    it('should log structured requests in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '📥 Request:',
        expect.stringContaining('"method": "GET"')
      );
      expect(mockNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log structured requests in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Request:',
        expect.stringContaining('"method":"GET"')
      );
      expect(mockNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateRequest', () => {
    it('should validate request body successfully', () => {
      const schema = {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      };

      mockRequest.body = { name: 'John Doe', email: 'john@example.com' };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid body', () => {
      const schema = {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      };

      mockRequest.body = { name: 'John Doe', email: 'invalid-email' };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid email address',
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'email',
              message: 'Invalid email address',
              code: 'invalid_format',
            },
          ],
        },
      });
    });

    it('should validate query parameters', () => {
      const schema = {
        query: z.object({
          page: z.string().transform(val => parseInt(val, 10)),
        }),
      };

      mockRequest.query = { page: '1' };

      const middleware = validateRequest(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query.page).toBe(1);
    });
  });

  describe('rateLimiter', () => {
    it('should reset window after expiry', () => {
      jest.useFakeTimers();
      const limiter = rateLimiter({ windowMs: 100, maxRequests: 1 });
      const req = { ip: '1.2.3.4' } as any;
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      limiter(req, res, next); // 1st request
      expect(next).toHaveBeenCalled();
      jest.advanceTimersByTime(200); // move time forward
      limiter(req, res, next); // should reset
      expect(next).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
    it('should call next(error) for non-Zod errors', () => {
      const schema = { body: { parse: () => { throw new Error('fail'); } } } as any;
      const req = { body: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      validateRequest(schema)(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
    it('should allow requests within limit', () => {
      const middleware = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = rateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      // First request should pass
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Second request should be blocked
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      mockResponse.removeHeader = jest.fn();
      mockResponse.setHeader = jest.fn();

      securityHeaders(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});