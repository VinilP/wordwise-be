import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuthRoutes } from './auth.routes';
import { createBookRoutes } from './book.routes';
import { createReviewRoutes } from './review.routes';
import { createRatingRoutes } from './rating.routes';
import { createUserRoutes } from './user.routes';
import { createRecommendationRoutes } from './recommendation.routes';
import { createPopularBooksRoutes } from './popular-books.routes';

export const createApiRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  // Authentication routes
  router.use('/auth', createAuthRoutes(prisma));

  // Book routes
  router.use('/books', createBookRoutes(prisma));

  // Review routes
  router.use('/reviews', createReviewRoutes(prisma));

  // Rating routes
  router.use('/ratings', createRatingRoutes(prisma));

  // User routes
  router.use('/users', createUserRoutes(prisma));

  // Recommendation routes
  router.use('/recommendations', createRecommendationRoutes(prisma));

  // Popular books routes
  router.use('/popular-books', createPopularBooksRoutes(prisma));

  return router;
};
