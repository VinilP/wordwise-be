import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PopularBooksController } from '../controllers/popular-books.controller';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export const createPopularBooksRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const popularBooksController = new PopularBooksController();
  const authMiddleware = createAuthMiddleware(prisma);

  // All routes require authentication
  router.use(authMiddleware.authenticate);

/**
 * @route GET /api/popular-books
 * @desc Get popular books based on reviews, ratings, and favorites
 * @access Private
 */
router.get('/', popularBooksController.getPopularBooks.bind(popularBooksController));

/**
 * @route GET /api/popular-books/top-rated
 * @desc Get top-rated books (minimum 3 reviews)
 * @access Private
 */
router.get('/top-rated', popularBooksController.getTopRatedBooks.bind(popularBooksController));

/**
 * @route GET /api/popular-books/most-explored
 * @desc Get most explored books (most reviews)
 * @access Private
 */
router.get('/most-explored', popularBooksController.getMostExploredBooks.bind(popularBooksController));

  return router;
};
