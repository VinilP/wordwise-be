import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { AuthService } from '../../src/services/auth.service';
import { JwtUtils } from '../../src/utils/jwt';
import { AppError } from '../../src/utils';
import { User } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/auth.service');
jest.mock('../../src/utils/jwt');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockJwtUtils: jest.Mocked<typeof JwtUtils>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Setup mocks
    mockPrisma = {} as jest.Mocked<PrismaClient>;
    mockAuthService = new AuthService(mockPrisma) as jest.Mocked<AuthService>;
    mockJwtUtils = JwtUtils as jest.Mocked<typeof JwtUtils>;
    
    authMiddleware = new AuthMiddleware(mockPrisma);
    (authMiddleware as any).authService = mockAuthService;

    mockRequest = {
      headers: {},
      user: undefined,
      params: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      // Setup
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockAuthService.validateToken.mockResolvedValue(mockUser);

      // Execute
      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockJwtUtils.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token');
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      // Setup
      mockRequest.headers = {};
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      // Execute
      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token validation fails', async () => {
      // Setup
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockJwtUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockAuthService.validateToken.mockRejectedValue(new Error('Invalid token'));

      // Execute
      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle AppError from auth service', async () => {
      // Setup - Create a proper AppError instance
      const appError = new AppError('Token expired', 401);
      
      mockRequest.headers = { authorization: 'Bearer expired-token' };
      mockJwtUtils.extractTokenFromHeader.mockReturnValue('expired-token');
      mockAuthService.validateToken.mockRejectedValue(appError);

      // Execute
      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Token expired',
          code: 'INVALID_TOKEN',
          details: undefined,
        },
      });
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate user with valid token', async () => {
      // Setup
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockAuthService.validateToken.mockResolvedValue(mockUser);

      // Execute
      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      // Setup
      mockRequest.headers = {};
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      // Execute
      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token validation fails', async () => {
      // Setup
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockJwtUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockAuthService.validateToken.mockRejectedValue(new Error('Invalid token'));

      // Execute
      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access when user owns the resource', async () => {
      // Setup
      mockRequest.user = mockUser;
      mockRequest.params = { userId: 'user-id' };
      const ownershipMiddleware = authMiddleware.requireOwnership('userId');

      // Execute
      await ownershipMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user does not own the resource', async () => {
      // Setup
      mockRequest.user = mockUser;
      mockRequest.params = { userId: 'different-user-id' };
      const ownershipMiddleware = authMiddleware.requireOwnership('userId');

      // Execute
      await ownershipMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied: insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      // Setup
      mockRequest.user = undefined;
      mockRequest.params = { userId: 'user-id' };
      const ownershipMiddleware = authMiddleware.requireOwnership('userId');

      // Execute
      await ownershipMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom parameter name', async () => {
      // Setup
      mockRequest.user = mockUser;
      mockRequest.params = { id: 'user-id' };
      const ownershipMiddleware = authMiddleware.requireOwnership('id');

      // Execute
      await ownershipMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token successfully', async () => {
      // Setup
      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      mockJwtUtils.verifyRefreshToken.mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com',
      });

      // Execute
      await authMiddleware.validateRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockJwtUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when refresh token is missing', async () => {
      // Setup
      mockRequest.body = {};

      // Execute
      await authMiddleware.validateRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Setup
      mockRequest.body = { refreshToken: 'invalid-refresh-token' };
      mockJwtUtils.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute
      await authMiddleware.validateRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});