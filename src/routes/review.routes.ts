import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { ReviewRepository } from '../repositories/review.repository';
import { BookRepository } from '../repositories/book.repository';
import { RatingService } from '../services/rating.service';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export const createReviewRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  // Initialize dependencies
  const reviewRepository = new ReviewRepository(prisma);
  const bookRepository = new BookRepository(prisma);
  const ratingService = new RatingService(prisma, bookRepository, reviewRepository);
  const reviewService = new ReviewService(reviewRepository, bookRepository, ratingService);
  const reviewController = new ReviewController(reviewService);
  const authMiddleware = createAuthMiddleware(prisma);

  // Routes
  router.post('/', authMiddleware.authenticate, reviewController.createReview);
  router.get('/book/:bookId', reviewController.getReviewsByBook);
  router.get('/user/:userId', reviewController.getReviewsByUser);
  router.get('/:id', reviewController.getReviewById);
  router.put('/:id', authMiddleware.authenticate, reviewController.updateReview);
  router.delete('/:id', authMiddleware.authenticate, reviewController.deleteReview);

  return router;
};