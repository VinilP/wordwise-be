import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RatingController } from '../controllers/rating.controller';
import { RatingService } from '../services/rating.service';
import { BookRepository } from '../repositories/book.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { RatingRecalculationJob } from '../jobs/rating-recalculation.job';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export const createRatingRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  // Initialize dependencies
  const bookRepository = new BookRepository(prisma);
  const reviewRepository = new ReviewRepository(prisma);
  const ratingService = new RatingService(prisma, bookRepository, reviewRepository);
  const ratingJob = new RatingRecalculationJob(ratingService);
  const ratingController = new RatingController(ratingService, ratingJob);
  const authMiddleware = createAuthMiddleware(prisma);

  // Public routes
  router.get('/book/:bookId/stats', ratingController.getBookRatingStats);
  router.get('/top-rated', ratingController.getTopRatedBooks);

  // Admin routes (require authentication)
  router.post('/recalculate', authMiddleware.authenticate, ratingController.recalculateAllRatings);
  router.get('/books-without-reviews', authMiddleware.authenticate, ratingController.getBooksWithoutReviews);
  router.put('/book/:bookId/update', authMiddleware.authenticate, ratingController.updateBookRating);

  return router;
};