import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/services/auth.service';
import { RegisterRequest, LoginRequest } from '../../src/types';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as any;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw error for missing email', async () => {
      const userData: RegisterRequest = {
        email: '',
        password: 'Password123!',
        name: 'Test User',
      };

      await expect(authService.register(userData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw error for missing password', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: '',
        name: 'Test User',
      };

      await expect(authService.register(userData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw error for missing name', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '',
      };

      await expect(authService.register(userData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw error for invalid email format', async () => {
      const userData: RegisterRequest = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User',
      };

      await expect(authService.register(userData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      };

      await expect(authService.register(userData)).rejects.toThrow('Password validation failed');
    });

    it('should throw error when user already exists', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: 'test@example.com',
        name: 'Existing User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
    });

    it('should register new user successfully', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const mockUser = {
        id: 'new-user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
    });
  });

  describe('login', () => {
    it('should throw error for missing email', async () => {
      const loginData: LoginRequest = {
        email: '',
        password: 'Password123!',
      };

      await expect(authService.login(loginData)).rejects.toThrow('Email and password are required');
    });

    it('should throw error for missing password', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: '',
      };

      await expect(authService.login(loginData)).rejects.toThrow('Email and password are required');
    });

    it('should throw error for invalid credentials', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should login successfully with valid credentials', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2a$10$hashedpassword', // bcrypt hash for 'Password123!'
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the password comparison to return true
      const mockPasswordUtils = require('../../src/utils');
      const originalComparePassword = mockPasswordUtils.PasswordUtils.comparePassword;
      mockPasswordUtils.PasswordUtils.comparePassword = jest.fn().mockResolvedValue(true);

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login(loginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');

      // Restore original function
      mockPasswordUtils.PasswordUtils.comparePassword = originalComparePassword;
    });
  });

  describe('refreshToken', () => {
    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should refresh token successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock JWT verification to return user ID
      const mockJwtUtils = require('../../src/utils');
      const originalVerifyRefreshToken = mockJwtUtils.JwtUtils.verifyRefreshToken;
      mockJwtUtils.JwtUtils.verifyRefreshToken = jest.fn().mockReturnValue({ userId: 'user-id' });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');

      // Restore original function
      mockJwtUtils.JwtUtils.verifyRefreshToken = originalVerifyRefreshToken;
    });
  });
});