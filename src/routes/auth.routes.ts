import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuthController } from '../controllers';
import { createAuthMiddleware } from '../middleware';
import { validateRequest } from '../middleware';
import { authSchemas } from '../middleware/validation';

export const createAuthRoutes = (prisma: PrismaClient): Router => {
  const router = Router();
  const authController = createAuthController(prisma);
  const authMiddleware = createAuthMiddleware(prisma);

  /**
   * @route   POST /api/auth/register
   * @desc    Register a new user
   * @access  Public
   */
  router.post(
    '/register',
    validateRequest(authSchemas.register),
    authController.register
  );

  /**
   * @route   POST /api/auth/login
   * @desc    Login user
   * @access  Public
   */
  router.post(
    '/login',
    validateRequest(authSchemas.login),
    authController.login
  );

  /**
   * @route   POST /api/auth/refresh
   * @desc    Refresh access token
   * @access  Public
   */
  router.post(
    '/refresh',
    validateRequest(authSchemas.refreshToken),
    authController.refreshToken
  );

  /**
   * @route   GET /api/auth/me
   * @desc    Get current user profile
   * @access  Private
   */
  router.get(
    '/me',
    authMiddleware.authenticate,
    authController.getCurrentUser
  );

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout user (client-side token invalidation)
   * @access  Private
   */
  router.post(
    '/logout',
    authMiddleware.authenticate,
    authController.logout
  );

  return router;
};