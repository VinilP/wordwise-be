import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { BookRepository } from '../repositories/book.repository';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export const createUserRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  // Initialize dependencies
  const userRepository = new UserRepository(prisma);
  const bookRepository = new BookRepository(prisma);
  const userService = new UserService(userRepository, bookRepository);
  const userController = new UserController(userService);
  const authMiddleware = createAuthMiddleware(prisma);

  // All user routes require authentication
  router.use(authMiddleware.authenticate);

  // GET /api/users/profile - Get user profile information
  router.get('/profile', userController.getProfile.bind(userController));

  // GET /api/users/profile/details - Get user profile with review history and favorites
  router.get('/profile/details', userController.getProfileWithDetails.bind(userController));

  // POST /api/users/favorites/:bookId - Add book to favorites
  router.post('/favorites/:bookId', userController.addToFavorites.bind(userController));

  // DELETE /api/users/favorites/:bookId - Remove book from favorites
  router.delete('/favorites/:bookId', userController.removeFromFavorites.bind(userController));

  // GET /api/users/favorites - Get user's favorite books
  router.get('/favorites', userController.getFavorites.bind(userController));

  // GET /api/users/favorites/:bookId/status - Check if book is favorited
  router.get('/favorites/:bookId/status', userController.checkFavoriteStatus.bind(userController));

  return router;
};