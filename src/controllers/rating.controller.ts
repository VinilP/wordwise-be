import { Request, Response, NextFunction } from 'express';
import { RatingService } from '../services/rating.service';
import { RatingRecalculationJob } from '../jobs/rating-recalculation.job';
import { popularBooksService } from '../services/popular-books.service';
import { createSuccessResponse, createErrorResponse } from '../utils';

export class RatingController {
  constructor(
    private ratingService: RatingService,
    private ratingJob: RatingRecalculationJob
  ) {}

  /**
   * Get rating statistics for a specific book
   */
  getBookRatingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json(
          createErrorResponse('Book ID is required', 'MISSING_BOOK_ID')
        );
        return;
      }

      const stats = await this.ratingService.getBookRatingStats(bookId);

      res.status(200).json(
        createSuccessResponse(stats, 'Rating statistics retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manually trigger rating recalculation for all books (admin endpoint)
   */
  recalculateAllRatings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ratingJob.execute();

      if (result.success) {
        res.status(200).json(
          createSuccessResponse(
            {
              processed: result.processed,
              duration: result.duration,
              startTime: result.startTime,
              endTime: result.endTime,
            },
            'Rating recalculation completed successfully'
          )
        );
      } else {
        res.status(207).json(
          createSuccessResponse(
            {
              processed: result.processed,
              errors: result.errors,
              duration: result.duration,
              startTime: result.startTime,
              endTime: result.endTime,
            },
            'Rating recalculation completed with some errors'
          )
        );
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get books that have no reviews (for maintenance)
   */
  getBooksWithoutReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookIds = await this.ratingService.getBooksWithoutReviews();

      res.status(200).json(
        createSuccessResponse(
          { bookIds, count: bookIds.length },
          'Books without reviews retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manually update rating for a specific book
   */
  updateBookRating = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookId } = req.params;

      if (!bookId) {
        res.status(400).json(
          createErrorResponse('Book ID is required', 'MISSING_BOOK_ID')
        );
        return;
      }

      await this.ratingService.updateBookRating(bookId);

      res.status(200).json(
        createSuccessResponse(null, 'Book rating updated successfully')
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get top-rated books
   */
  getTopRatedBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const topRatedBooks = await popularBooksService.getTopRatedBooks();

      res.status(200).json(
        createSuccessResponse(topRatedBooks, 'Top-rated books retrieved successfully')
      );
    } catch (error) {
      next(error);
    }
  };
}