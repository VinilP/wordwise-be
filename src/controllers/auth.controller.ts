import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services';
import { 
  RegisterRequest, 
  LoginRequest 
} from '../types';
import { 
  asyncHandler, 
  createSuccessResponse, 
  createErrorResponse,
  HTTP_STATUS 
} from '../utils';

export class AuthController {
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const userData: RegisterRequest = req.body;
    
    const result = await this.authService.register(userData);
    
    res.status(HTTP_STATUS.CREATED).json(
      createSuccessResponse(result, 'User registered successfully')
    );
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginRequest = req.body;
    
    const result = await this.authService.login(credentials);
    
    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Login successful')
    );
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    const result = await this.authService.refreshToken(refreshToken);
    
    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Token refreshed successfully')
    );
  });

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse('User not authenticated', 'NOT_AUTHENTICATED')
      );
      return;
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(req.user, 'User profile retrieved successfully')
    );
  });

  /**
   * Logout user (client-side token invalidation)
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token from storage. However, we can provide
    // an endpoint for consistency and future token blacklisting if needed.
    
    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Logout successful')
    );
  });
}

// Factory function to create auth controller instance
export const createAuthController = (prisma: PrismaClient) => {
  return new AuthController(prisma);
};