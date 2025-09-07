// Example usage of the middleware system
// This file demonstrates how to use the validation middleware with routes

import { Router } from 'express';
import { validateRequest, authSchemas, bookSchemas, reviewSchemas } from './index';
import { asyncHandler } from '../utils';

const router = Router();

// Example: User registration with validation
router.post(
  '/auth/register',
  validateRequest(authSchemas.register),
  asyncHandler(async (req, res) => {
    // At this point, req.body is validated and typed
    const { email, password, name } = req.body;
    
    // Registration logic would go here
    console.log('Registering user:', { email, name, passwordLength: password.length }); // Use variables to avoid lint error
    res.status(201).json({
      success: true,
      data: { message: 'User registered successfully' },
    });
  })
);

// Example: User login with validation
router.post(
  '/auth/login',
  validateRequest(authSchemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Login logic would go here
    console.log('Login attempt for:', email, 'with password length:', password.length); // Use variables to avoid lint error
    res.json({
      success: true,
      data: { token: 'jwt-token-here' },
    });
  })
);

// Example: Get books with query parameter validation
router.get(
  '/books',
  validateRequest(bookSchemas.getBooks),
  asyncHandler(async (req, res) => {
    // req.query is now validated and transformed
    const { page, limit, genre, minRating, author } = req.query;
    
    // Book fetching logic would go here
    console.log('Fetching books with filters:', { genre, minRating, author }); // Use variables
    res.json({
      success: true,
      data: {
        books: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      },
    });
  })
);

// Example: Get book by ID with parameter validation
router.get(
  '/books/:id',
  validateRequest(bookSchemas.getBookById),
  asyncHandler(async (req, res) => {
    const { id } = req.params; // Validated UUID
    
    // Book fetching logic would go here
    res.json({
      success: true,
      data: { book: { id, title: 'Sample Book' } },
    });
  })
);

// Example: Create review with body validation
router.post(
  '/reviews',
  validateRequest(reviewSchemas.createReview),
  asyncHandler(async (req, res) => {
    const { bookId, rating, content } = req.body;
    
    // Review creation logic would go here
    res.status(201).json({
      success: true,
      data: { review: { id: 'new-review-id', bookId, rating, content } },
    });
  })
);

// Example: Update review with both params and body validation
router.put(
  '/reviews/:id',
  validateRequest(reviewSchemas.updateReview),
  asyncHandler(async (req, res) => {
    const { id } = req.params; // Validated UUID
    const { rating, content } = req.body; // Validated review data
    
    // Review update logic would go here
    res.json({
      success: true,
      data: { review: { id, rating, content } },
    });
  })
);

export default router;