import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { CreateReviewRequest, UpdateReviewRequest, User } from '../types';

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  // POST /api/reviews - Create a new review
  createReview = async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const reviewData: CreateReviewRequest = req.body;

      // Validate required fields
      if (!reviewData.bookId || reviewData.rating === undefined || reviewData.rating === null) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Book ID and rating are required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      // Validate rating range
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Rating must be between 1 and 5',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const review = await this.reviewService.createReview(req.user.id, reviewData);

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/reviews/book/:bookId - Get reviews for a specific book
  getReviewsByBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Book ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const reviews = await this.reviewService.getReviewsByBook(bookId);

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/reviews/user/:userId - Get reviews by a specific user
  getReviewsByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const reviews = await this.reviewService.getReviewsByUser(userId);

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/reviews/:id - Get a specific review by ID
  getReviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Review ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const review = await this.reviewService.getReviewById(id);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/reviews/:id - Update a review
  updateReview = async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const { id } = req.params;
      const updateData: UpdateReviewRequest = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Review ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      // Validate rating if provided
      if (updateData.rating !== undefined && (updateData.rating < 1 || updateData.rating > 5)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Rating must be between 1 and 5',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const review = await this.reviewService.updateReview(id, req.user.id, updateData);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/reviews/:id - Delete a review
  deleteReview = async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Review ID is required',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      await this.reviewService.deleteReview(id, req.user.id);

      res.status(200).json({
        success: true,
        data: { message: 'Review deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  };
}