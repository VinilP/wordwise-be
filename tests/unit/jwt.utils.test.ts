import { JwtUtils } from '../../src/utils/jwt';
import { User } from '../../src/types';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  TokenExpiredError: class extends Error {
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  },
  JsonWebTokenError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
}));

const mockSign = require('jsonwebtoken').sign;
const mockVerify = require('jsonwebtoken').verify;
const MockTokenExpiredError = require('jsonwebtoken').TokenExpiredError;
const MockJsonWebTokenError = require('jsonwebtoken').JsonWebTokenError;

describe('JwtUtils', () => {
  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      // Setup mocks
      mockSign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      // Execute
      const result = JwtUtils.generateTokens(mockUser);

      // Verify
      expect(mockSign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const mockPayload = { userId: 'user-id', email: 'test@example.com' };
      
      // Setup mocks
      mockVerify.mockReturnValue(mockPayload as any);

      // Execute
      const result = JwtUtils.verifyToken('valid-token');

      // Verify
      expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret-key');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for expired token', () => {
      // Setup mocks
      const expiredError = new MockTokenExpiredError('Token expired', new Date());
      mockVerify.mockImplementation(() => {
        throw expiredError;
      });

      // Execute & Verify
      expect(() => JwtUtils.verifyToken('expired-token')).toThrow('Token expired');
    });

    it('should throw error for invalid token', () => {
      // Setup mocks
      const invalidError = new MockJsonWebTokenError('Invalid token');
      mockVerify.mockImplementation(() => {
        throw invalidError;
      });

      // Execute & Verify
      expect(() => JwtUtils.verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw generic error for other JWT errors', () => {
      // Setup mocks
      const genericError = new Error('Some other error');
      mockVerify.mockImplementation(() => {
        throw genericError;
      });

      // Execute & Verify
      expect(() => JwtUtils.verifyToken('token')).toThrow('Token verification failed');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const mockPayload = { userId: 'user-id', email: 'test@example.com' };
      
      // Setup mocks
      mockVerify.mockReturnValue(mockPayload as any);

      // Execute
      const result = JwtUtils.verifyRefreshToken('valid-refresh-token');

      // Verify
      expect(mockVerify).toHaveBeenCalledWith('valid-refresh-token', 'test-refresh-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for expired refresh token', () => {
      // Setup mocks
      const expiredError = new MockTokenExpiredError('Refresh token expired', new Date());
      mockVerify.mockImplementation(() => {
        throw expiredError;
      });

      // Execute & Verify
      expect(() => JwtUtils.verifyRefreshToken('expired-refresh-token')).toThrow('Refresh token expired');
    });

    it('should throw error for invalid refresh token', () => {
      // Setup mocks
      const invalidError = new MockJsonWebTokenError('Invalid refresh token');
      mockVerify.mockImplementation(() => {
        throw invalidError;
      });

      // Execute & Verify
      expect(() => JwtUtils.verifyRefreshToken('invalid-refresh-token')).toThrow('Invalid refresh token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const authHeader = 'Bearer valid-token';
      
      // Execute
      const result = JwtUtils.extractTokenFromHeader(authHeader);

      // Verify
      expect(result).toBe('valid-token');
    });

    it('should return null for undefined header', () => {
      // Execute
      const result = JwtUtils.extractTokenFromHeader(undefined);

      // Verify
      expect(result).toBeNull();
    });

    it('should return null for malformed header', () => {
      const malformedHeader = 'InvalidFormat token';
      
      // Execute
      const result = JwtUtils.extractTokenFromHeader(malformedHeader);

      // Verify
      expect(result).toBeNull();
    });

    it('should return null for header without token', () => {
      const headerWithoutToken = 'Bearer';
      
      // Execute
      const result = JwtUtils.extractTokenFromHeader(headerWithoutToken);

      // Verify
      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const emptyHeader = '';
      
      // Execute
      const result = JwtUtils.extractTokenFromHeader(emptyHeader);

      // Verify
      expect(result).toBeNull();
    });
  });
});