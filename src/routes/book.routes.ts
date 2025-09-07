import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BookController } from '../controllers/book.controller';
import { BookService } from '../services/book.service';
import { BookRepository } from '../repositories/book.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { RatingService } from '../services/rating.service';

export const createBookRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  // Initialize dependencies
  const bookRepository = new BookRepository(prisma);
  const reviewRepository = new ReviewRepository(prisma);
  const ratingService = new RatingService(prisma, bookRepository, reviewRepository);
  const bookService = new BookService(bookRepository, ratingService);
  const bookController = new BookController(bookService);

  // Routes
  router.get('/', bookController.getAllBooks);
  router.get('/search', bookController.searchBooks);
  router.get('/popular', bookController.getPopularBooks);
  router.get('/genre/:genre', bookController.getBooksByGenre);
  router.get('/:id', bookController.getBookById);

  return router;
};