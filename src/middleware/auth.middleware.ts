import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services';
import { 
  JwtUtils, 
  AppError, 
  HTTP_STATUS, 
  createErrorResponse,
  asyncHandler 
} from '../utils';
import { User } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
  }

  /**
   * Middleware to authenticate JWT tokens
   */
  authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = JwtUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse('Authentication required', 'MISSING_TOKEN')
      );
      return;
    }

    try {
      const user = await this.authService.validateToken(token);
      req.user = user;
      next();
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Invalid token';
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(message, 'INVALID_TOKEN')
      );
    }
  });

  /**
   * Middleware to check if user is authenticated (optional authentication)
   */
  optionalAuthenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = JwtUtils.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const user = await this.authService.validateToken(token);
        req.user = user;
      } catch (error) {
        // Silently fail for optional authentication
        req.user = undefined;
      }
    }

    next();
  });

  /**
   * Middleware to check if the authenticated user owns the resource
   */
  requireOwnership = (userIdParam: string = 'userId') => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          createErrorResponse('Authentication required', 'AUTHENTICATION_REQUIRED')
        );
        return;
      }

      const resourceUserId = req.params[userIdParam];
      
      if (req.user.id !== resourceUserId) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          createErrorResponse('Access denied: insufficient permissions', 'INSUFFICIENT_PERMISSIONS')
        );
        return;
      }

      next();
    });
  };

  /**
   * Middleware to validate refresh token
   */
  validateRefreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Refresh token is required', 'MISSING_REFRESH_TOKEN')
      );
      return;
    }

    try {
      JwtUtils.verifyRefreshToken(refreshToken);
      next();
    } catch (error) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse('Invalid refresh token', 'INVALID_REFRESH_TOKEN')
      );
    }
  });
}

// Factory function to create auth middleware instance
export const createAuthMiddleware = (prisma: PrismaClient) => {
  return new AuthMiddleware(prisma);
};