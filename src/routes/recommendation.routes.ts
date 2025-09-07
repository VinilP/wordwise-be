import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import recommendationController from '../controllers/recommendation.controller';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export const createRecommendationRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const authMiddleware = createAuthMiddleware(prisma);

  // All recommendation routes require authentication
  router.use(authMiddleware.authenticate);

  /**
   * @route GET /api/recommendations
   * @desc Get personalized book recommendations for authenticated user
   * @access Private
   */
  router.get('/', recommendationController.getRecommendations.bind(recommendationController));

  /**
   * @route DELETE /api/recommendations/cache
   * @desc Clear recommendation cache for authenticated user
   * @access Private
   */
  router.delete('/cache', recommendationController.clearCache.bind(recommendationController));

  return router;
};