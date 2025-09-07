import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
  password: z
    .string()
    .min(8, 'Password validation failed: Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password validation failed: Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  
  // Name validation
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  // Pagination parameters
  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  }),
  
  // Rating validation (1-5 stars)
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  
  // Review content validation
  reviewContent: z
    .string()
    .min(10, 'Review content must be at least 10 characters')
    .max(2000, 'Review content must not exceed 2000 characters')
    .optional(),
  
  // Book search query
  searchQuery: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must not exceed 100 characters'),
  
  // Genre validation
  genre: z
    .string()
    .min(2, 'Genre must be at least 2 characters')
    .max(30, 'Genre must not exceed 30 characters'),
};

// Authentication schemas
export const authSchemas = {
  register: {
    body: z.object({
      email: commonSchemas.email,
      password: commonSchemas.password,
      name: commonSchemas.name,
    }),
  },
  
  login: {
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1, 'Password is required'),
    }),
  },
  
  refreshToken: {
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  },
};

// Book schemas
export const bookSchemas = {
  getBooks: {
    query: commonSchemas.pagination.extend({
      genre: z.string().optional(),
      minRating: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined))
        .refine((val) => val === undefined || (val >= 1 && val <= 5), 'Rating must be between 1 and 5'),
      author: z.string().optional(),
    }),
  },
  
  getBookById: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
  },
  
  searchBooks: {
    query: z.object({
      q: commonSchemas.searchQuery,
      ...commonSchemas.pagination.shape,
    }),
  },
};

// Review schemas
export const reviewSchemas = {
  createReview: {
    body: z.object({
      bookId: commonSchemas.uuid,
      rating: commonSchemas.rating,
      content: commonSchemas.reviewContent,
    }),
  },
  
  updateReview: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
    body: z.object({
      rating: commonSchemas.rating.optional(),
      content: commonSchemas.reviewContent,
    }),
  },
  
  deleteReview: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
  },
  
  getReviewsByBook: {
    params: z.object({
      bookId: commonSchemas.uuid,
    }),
    query: commonSchemas.pagination,
  },
  
  getReviewsByUser: {
    params: z.object({
      userId: commonSchemas.uuid,
    }),
    query: commonSchemas.pagination,
  },
};

// User schemas
export const userSchemas = {
  addToFavorites: {
    params: z.object({
      bookId: commonSchemas.uuid,
    }),
  },
  
  removeFromFavorites: {
    params: z.object({
      bookId: commonSchemas.uuid,
    }),
  },
  
  getFavorites: {
    query: commonSchemas.pagination,
  },
};