import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class UserController {
  constructor(private userService: UserService) {}

  async getProfile(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const profile = await this.userService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: profile,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getProfileWithDetails(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const profile = await this.userService.getUserProfileWithDetails(req.user.id);

      res.json({
        success: true,
        data: profile,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async addToFavorites(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Book ID is required',
            code: 'VALIDATION_ERROR',
          },
        } as ApiResponse);
        return;
      }

      const favorite = await this.userService.addToFavorites(req.user.id, bookId);

      res.status(201).json({
        success: true,
        data: favorite,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Book not found') {
          res.status(404).json({
            success: false,
            error: {
              message: 'Book not found',
              code: 'BOOK_NOT_FOUND',
            },
          } as ApiResponse);
          return;
        }
        if (error.message === 'Book is already in favorites') {
          res.status(409).json({
            success: false,
            error: {
              message: 'Book is already in favorites',
              code: 'ALREADY_FAVORITED',
            },
          } as ApiResponse);
          return;
        }
      }
      next(error);
    }
  }

  async removeFromFavorites(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Book ID is required',
            code: 'VALIDATION_ERROR',
          },
        } as ApiResponse);
        return;
      }

      await this.userService.removeFromFavorites(req.user.id, bookId);

      res.json({
        success: true,
        data: { message: 'Book removed from favorites' },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof Error && error.message === 'Book is not in favorites') {
        res.status(404).json({
          success: false,
          error: {
            message: 'Book is not in favorites',
            code: 'NOT_FAVORITED',
          },
        } as ApiResponse);
        return;
      }
      next(error);
    }
  }

  async getFavorites(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const favorites = await this.userService.getUserFavorites(req.user.id);

      res.json({
        success: true,
        data: favorites,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async checkFavoriteStatus(req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        } as ApiResponse);
        return;
      }

      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Book ID is required',
            code: 'VALIDATION_ERROR',
          },
        } as ApiResponse);
        return;
      }

      const isFavorite = await this.userService.isFavorite(req.user.id, bookId);

      res.json({
        success: true,
        data: { isFavorite },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}