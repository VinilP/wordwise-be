import { PrismaClient } from '@prisma/client';
import { 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse, 
  User 
} from '../types';
import { 
  JwtUtils, 
  PasswordUtils, 
  AppError, 
  HTTP_STATUS,
  isValidEmail 
} from '../utils';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const { email, password, name } = userData;

    // Validate input
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidEmail(email)) {
      throw new AppError('Invalid email format', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new AppError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', HTTP_STATUS.CONFLICT);
    }

    // Hash password
    const hashedPassword = await PasswordUtils.hashPassword(password);

    // Create user
    const newUser = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate tokens
    const { token, refreshToken } = JwtUtils.generateTokens(newUser);

    return {
      user: newUser,
      accessToken: token,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidEmail(email)) {
      throw new AppError('Invalid email format', HTTP_STATUS.BAD_REQUEST);
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    // Create user object without password
    const userWithoutPassword: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Generate tokens
    const { token, refreshToken } = JwtUtils.generateTokens(userWithoutPassword);

    return {
      user: userWithoutPassword,
      accessToken: token,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', HTTP_STATUS.BAD_REQUEST);
    }

    try {
      // Verify refresh token
      const payload = JwtUtils.verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED);
      }

      // Generate new tokens
      const tokens = JwtUtils.generateTokens(user);

      return {
        user,
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Validate user token and return user data
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = JwtUtils.verifyToken(token);
      
      const user = await this.getUserById(payload.userId);
      if (!user) {
        throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED);
    }
  }
}